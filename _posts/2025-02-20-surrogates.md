---
title: "Understanding Surrogate Pairs: Why Some Windows Filenames Can’t Be Read"
tags:
  - Windows
  - Encoding
  - Detection
  - Filesystem
last_modified_at: 2025-02-26T12:32:00+02:00
---

This time I am going to write about some odd behavior by Windows. The behavior is by design and there is no obvious security impact. Therefore, this article is written just for the sake of sharing some geeky content.

## What do you see?

You checked the Task Manager and saw these. Many executables are relatively small, with a square in the name. What is your initial assumption?

<img src="/assets/what.png" width="800" alt="square.exe">

You would assume that it is not directly malicious but still suspicious. You checked the event logs for Event ID 4688.

<img src="/assets/what-event1.png" width="800" alt="Event 4688 General">

It's not very helpful. You see another substitute character. You assume it is a possible encoding issue. Could the executable name use a non-Latin alphabet? Probably. Let's check the Details tab.

<img src="/assets/what-event2.png" width="800" alt="Event 4688 Details- Friendly">

This executable name is so broken that it manages to break the Details view in both Friendly and XML views.

## Encoding, but what and how?

At least we know the location of the executable. We have a broken name and a substitute character. We know it is not a huge issue until now. We can find the path and see what is under that folder.

<img src="/assets/what-folder.png" width="800" alt="Folder">

It is weirder. It is not one but many executables. They look the same, but no; they are definitely not. NTFS cannot allow files with the same name in the same directory. So, all of these have different names, but they are substituted. Let's check how many files we have in this form.

<img src="/assets/what-folder-count.png" width="450" alt="Folder count: 2048 files">

There are many of them. Now we know that the processes we see may not be the same executable, which was created multiple times. They can be any subset of these 2048 executables and then be created multiple times. You may not identify the executable with existing information.

## What are these?

The executables are not as mysterious as expected. These are just small `hello world` applications. Or rather, a modified version of [Davide Pisanò](https://github.com/davide99)'s **[the smallest Windows application](https://davidesnotes.com/articles/1/?page=5)** that I used as an example.

<img src="/assets/what-hello.png" width="400" alt="Folder">

There is nothing suspicious about the executable. It is just the weird decoding issue. The question, then, becomes what characters are these    that we cannot render? Can we install some language packs to view them?

## It's complicated

These files have names that include unrenderable characters. No language pack can help you. These are called surrogate pairs. There are better explanations online, and I'd rather leave the explanation to them. I'd like to summarize, still[^1].

Windows was an early adopter of Unicode, and its file APIs use UTF‑16 internally since Windows 2000-used to be UCS-2 in Windows 95 era, when Unicode standard was only a draft on paper, but that's another topic. Using UTF-16 means that filenames, text strings, and other data are stored as sequences of 16‑bit units. For Windows, a properly formed surrogate pair is perfectly acceptable[^2]. However, issues arise when string manipulation produces isolated or malformed surrogates. Such errors can lead to unreadable filenames and display glitches—even though the operating system itself can execute files correctly. But we can create them deliberately as well, which we can see below.

## Understanding Surrogate Pairs

Before we go any further, it’s essential to define some fundamental terms:

- **Code Unit**: A fixed‑length piece of data in an encoding scheme. In UTF‑16, a code unit is 16 bits.
- **Code Point**: An integer value uniquely identifying an abstract character in Unicode (for example, U+0041 represents “A”).
- **Surrogate**: In UTF‑16, certain code units are reserved to encode characters beyond the Basic Multilingual Plane (BMP).
- **High Surrogates**: U+D800 to U+DBFF
- **Low Surrogates**: U+DC00 to U+DFFF
- **Surrogate Pair**: A valid combination where a high surrogate is immediately followed by a low surrogate. Together, they represent a single Unicode code point above U+FFFF.

When Unicode expanded beyond the BMP, UTF‑16 was designed to encode code points above U+FFFF using two 16‑bit units rather than one. For example, to manually encode `U+1F926` (the “facepalm” emoji, 🤦) in UTF‑16:

- Subtract the Base: `0x1F926 – 0x10000 = 0xF926.`
- Split into Two 10‑Bit Values:
  - Most significant 10 bits: `62` (decimal)
  - Least significant 10 bits: `294` (decimal)
- Add the Surrogate Bases:
  - High surrogate = `0xD800 + 62 → 0xD83E`
  - Low surrogate = `0xDC00 + 294 → 0xDD26`

Thus, the surrogate pair `\ud83e\udd26` represents the emoji 🤦. Although these surrogate code points do not represent independent characters, when paired they denote a single Unicode code point. I suggest having a look at [How to Create a UTF-16 Surrogate Pair by Hand, with Python](https://www.oilshell.org/blog/2023/06/surrogate-pair.html) article by [Andy Chu](https://andychu.net/).

## Wanna try?

You can try the Python code below to create a bunch of squares or rather files with invalid UTF-8 names that cannot be rendered in any localization setup. As you have read above, these are expected not to be rendered. To create unrenderable file names, we need the high and low surrogates. See the table for the range.

| Surrogate Type | Unicode Range | Expected UTF-8 Encoding |
|----------------|---------------|-------------------------|
| High Surrogates | U+D800–U+DBFF | ED A0 80 to ED AF BF |
| Low Surrogates | U+DC00–U+DFFF | ED B0 80 to ED BF BF |

In the code below, we use the constant first byte, then enumerate second and third bytes in the range to build a valid UTF-16 filename, that is not renderable. See the `surrogatepass` parameter below, you probably never needed to use. You may need to have a look to understand the problem with paths and how Python handles them[^3]. I believe the code is clear and readable and no more explanation is needed.

```python
import os

out_path = "./win32/"
out_path = os.path.abspath(out_path)
os.makedirs(out_path, exist_ok=True)
os.chdir(out_path)

success_count = 0
total = 0

# Iterate over the valid ranges for the second and third bytes.
for second_byte in range(0xA0, 0xC0):  # 0xA0 to 0xBF inclusive
    for third_byte in range(0x80, 0xC0):  # 0x80 to 0xBF inclusive
        # Construct the valid 3-byte sequence: fixed first byte 0xED + second and third bytes.
        candidate_bytes = bytes([0xED, second_byte, third_byte])
        # Decode using 'surrogatepass' to allow these otherwise invalid Unicode code points.
        candidate = candidate_bytes.decode('utf-8', errors='surrogatepass')
        try:
            # Create a file with the candidate name and write a single character.
            with open(candidate, "w", encoding='utf-8', errors='surrogatepass') as f:
                f.write('')
            print(f"Created file {candidate_bytes}")  # type: ignore
            success_count += 1
        except Exception as e:
            print(f"Failed to create file {candidate_bytes}: {e}")  # type: ignore
        total += 1

print(f"\n\nFiles created in directory: {out_path}\n")
print(f"{success_count} files created out of {total} total files")
```

Test the code, and play with it. I know that these would break some FIM solutions but that's where my research ends. And if you find any use cases for these to be used for detection, bypass or any security-related effect, please let me know. You can contact me over email, Github or LinkedIn.

## Postscriptum

I wanted to add another section about comparison with Linux. Even though I mentioned it in the footnotes, it is better to visualize.

Let's check the existing file on WSL, to see how Ubuntu will render it. When we check the locale, we see that our WSL instance is set to use UTF-8:

<img src="/assets/what-wsl-locale.png" width="600" alt="locale command result on WSL">

And when we use `ll` command, we see that the shell does not play well with these characters.

<img src="/assets/what-wsl-ll1.png" width="600" alt="ll command result on WSL:">
<img src="/assets/what-wsl-ll2.png" width="600" alt="ll command result on WSL">
<img src="/assets/what-wsl-ll3.png" width="600" alt="ll command result on WSL">

WSL not only fails to render the files but also fails to query the file metadata. I assume it is because it tries to get them as UTF-8 text and queries with their version, causing Win32 API to return nothing because of invalid parameters. But at least the file count is correct.

A fairer comparison would be using UTF-16 on Linux but unfortunately it is not possible. **You cannot set UTF-16 as locale on Linux**. But we can run our script on Linux-in my case within WSL- so we do not make use of NTFS.

<img src="/assets/what-wsl-lin1.png" width="600" alt="run the script on WSL with UTF-8 locale">
<img src="/assets/what-wsl-lin2.png" width="600" alt="run the script on WSL with UTF-8 locale">

While the script result tells us that all the write operations succeeded, `ls` shows only 2 files! Since Linux here drops of the second part, it overrides the same file. This is not what I have expected. For a better understanding, I used `unset LANG` and `export LC_ALL=POSIX` to fall back to POSIX instead of UTF-8. I am not sure if it would make any difference, so this is me learning by trial and error.

<img src="/assets/what-wsl-lin3.png" width="600" alt="Changed the locale to POSIX">
<img src="/assets/what-wsl-lin4.png" width="600" alt="Changed the locale to POSIX">

Script gets completed as expected. But this time there are only one file generated instead of 2! At this point I am not sure what has happened. I am assuming this is due to the fact that UTF-8 supports more characters so that it allowed one more valid file name than POSIX did. Let me know if you have more information on the behavioral difference here. You can find the code I used on Linux here. Beware that I do not use `surrogatepass` as we do not decode bytes to string in Linux. We can just use bytes as file names.

```python
import os

in_path: str = r'./MinHW.exe'

with open(in_path, 'rb') as f:
    data: bytes = f.read()

out_path = "./linux/"
out_path = os.path.abspath(out_path)
os.makedirs(out_path, exist_ok=True)
os.chdir(out_path)

success_count = 0
total = 0

# Iterate over the valid ranges for the second and third bytes.
for second_byte in range(0xA0, 0xC0):  # 0xA0 to 0xBF inclusive
    for third_byte in range(0x80, 0xC0):  # 0x80 to 0xBF inclusive
        # Construct the valid 3-byte sequence: fixed first byte 0xED + second and third bytes.
        candidate = bytes([0xED, second_byte, third_byte])
        try:
            # Create a file with the candidate name and write a single character.
            name = candidate + b'.exe'
            with open(name, "wb") as f:
                f.write(data)
            print(f"Created file {candidate}")  # type: ignore
            success_count += 1
        except Exception as e:
            print(f"Failed to create file {candidate}: {e}")  # type: ignore
        total += 1

print(f"\n\nFiles created in directory: {out_path}\n")
print(f"{success_count} files created out of {total} total files")
```

We can see that surrogate pairs, as UTF-16-specific features, causes different behavior on Windows and Linux side. Windows allowed these characters to be used while Linux dropped some bytes, *possibly* UTF-8 assumptions. I don't know enough about the internals here.

---

[^1]: Check out [this great article on the history of UCS-2](https://unascribed.com/b/2019-08-02-the-tragedy-of-ucs2.html). Also, on the disadvantages of being an early adopter, you may try [Raymond Chen's article](https://devblogs.microsoft.com/oldnewthing/20190830-00/?p=102823) on it as well.
[^2]: In most Linux filesystems, these characters are acceptable as well. Do be more precise, Linux does not use any encoding as path, since the unit of paths are considered to be bytes, not a higher level abstraction. If you can represent something merely in a sequence of bytes, they are valid. There are two constraints though: `0x00` (null) and `0x2F` ("/"). You cannot use them within file or directory names. Assuming ASCII or UTF-8 is a relatively new habit. Some filesystems allow [UTF-8 enforcement on paths](https://rubenerd.com/forgetting-to-set-utf-normalisation-on-a-zfs-pool/) but that's not a common approach.
[^3]: See these two amazing articles, [our solution for the hell that is filename encoding, such as it is](https://beets.io/blog/paths.html) and [Missing Pieces in Python 3 Unicode](https://thoughtstreams.io/ncoghlan_dev/missing-pieces-in-python-3-unicode/) for paths, surrogate pairs and Python way of handling them.
