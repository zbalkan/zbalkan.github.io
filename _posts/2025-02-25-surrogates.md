---
title: "Can you detect what you cannot see?"
tags:
  - Windows
  - Encoding
  - Detection
  - Filesystem
---

This time I am going to write about some odd behavior of Windows. The behavior is by design and there is no obvious security impact. Therefore, this article is written just for the sake of sharing some geeky content.

## What do you see?

You checked the Task Manager and saw these. Many executables are relatively small in size with a square in the name. What is your initial assumption?

<img src="/assets/what.png" width="800" alt="square.exe">

You would assume that it is not directly malicious but still suspicious. You checked the event logs for Event ID 4688.

<img src="/assets/what-event1.png" width="800" alt="Event 4688 General">

Not so helpful. You see another substitute character. You assume it is a possible encoding issue. Could the executable name use a non-Latin alphabet? Probably. Let's check the Details tab.

<img src="/assets/what-event2.png" width="800" alt="Event 4688 Details- Friendly">

This executable name is so broken that it manages to break the Details view in both Friendly and XML views.

## Encoding but what and how?

At least we know the location of the executable. We have a broken name and a substitute character. We know it is not a huge issue until now. We can find the path and see what is under that folder.

<img src="/assets/what-folder.png" width="800" alt="Folder">

It is weirder. It is not one but many executables. They look the same but no, they are not. NTFS cannot allow files with the same name in the same directory. So, all of these have different names, but they are substituted. Let's check how many files we have in this form.

<img src="/assets/what-folder-count.png" width="450" alt="Folder count: 2048 files">

There are many of them. Now we know that the processes we see may not be the same executable, which was created multiple times. They can be any subset of these 2048 executables and then be created multiple times. You may not identify the executable with existing information.

## What are these?

These are not as mysterious as expected. These are just small `hello world` applications. Or rather, a modified version of [Davide Pisanò](https://github.com/davide99)'s **[the smallest Windows application](https://davidesnotes.com/articles/1/?page=5)**

<img src="/assets/what-hello.png" width="400" alt="Folder">

There is nothing suspicious about the executable. It is just the weird decoding issue. The question, then, becomes what characters are these    that we cannot render? Can we install some language packs to view them?

## It's complicated

These files have names that include characters that cannot be rendered at all. They are out of UTF-8 coverage as well. No language pack can help you. These are called surrogate pairs. There are better explanations online, and I'd rather leave the explanation to them. I'd like to summarize anyway.

Windows was an early adopter of Unicode, and its file APIs use UTF‑16 internally. This means that filenames, text strings, and other data are stored as sequences of 16‑bit units. For Windows, a properly formed surrogate pair is perfectly acceptable. However, issues arise when string manipulation (often written under the old UCS‑2 assumptions) produces isolated or malformed surrogates. Such errors can lead to unreadable filenames and display glitches—even though the operating system itself can execute files correctly. Check out [this great article on the history of UCS-2](https://unascribed.com/b/2019-08-02-the-tragedy-of-ucs2.html). Also, on the disadvantages of being an early adopter, you may try [Raymond Chen's article](https://devblogs.microsoft.com/oldnewthing/20190830-00/?p=102823) on it as well.

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

You can try the Python code below to create a bunch of squares or rather files with invalid UTF-8 names that cannot be rendered in any localization setup. As you have read above, these are expected not to be rendered.

```python
import os

out_path = "./win32/"
out_path = os.path.abspath(out_path)
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
            with open(candidate, "w", encoding='utf8', errors='surrogatepass') as f:
                f.write('')
            print(f"Created file {candidate_bytes}")  # type: ignore
            success_count += 1
        except Exception as e:
            print(f"Failed to create file {candidate_bytes}: {e}")  # type: ignore
        total += 1

print(f"\n\nFiles created in directory: {out_path}\n")
print(f"{success_count} files created out of {total} total files")
```

Test the code, and play with it. And if you find any use cases for these to be used for detection, bypass or any security-related effect, please let me know. You can contact me over email, Github or LinkedIn.
