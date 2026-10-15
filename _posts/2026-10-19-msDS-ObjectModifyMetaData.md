---
title: "A one-line comment that became an Active Directory attribute"
excerpt: "A comment under a Microsoft Technical Takeoff session led to msDS-ObjectModifyMetaData, a constructed attribute that records who last changed each attribute of an Active Directory object."
tags:
  - Active Directory
  - Windows Server
  - Digital forensics
  - Community contribution
---

*These are experimental observations from a single-DC lab on Windows Server Insider Preview build 29683 (schema version 93). The attribute is undocumented and planned for Windows Server 2028, so its behaviour may change before release.*

Active Directory has never been able to tell you, from the object itself, who disabled an account or changed a service principal name. That answer lived in event 5136, and only if the audit policy and SACLs were in place and the events were still retained when you went looking. In Windows Server Insider Preview the object carries that answer itself, because a new constructed attribute, `msDS-ObjectModifyMetaData`, records who last modified each of its attributes.

The attribute has a personal history for me. In November 2023 Linda Taylor and Wayne McIntyre presented [What's new in Active Directory](https://techcommunity.microsoft.com/event/WindowsEvents/whats-new-in-active-directory/3971596) at Microsoft Technical Takeoff. Both work in the Active Directory team at Microsoft, Linda as a Principal Software Engineer and Wayne as a Software Engineer. Under the session I commented that "AD desperately needs creatorsName and modifiersName attributes". [X.501](https://www.itu.int/rec/T-REC-X.501-201910-I) defines both, and [RFC 4512](https://www.rfc-editor.org/rfc/rfc4512#section-3.4) states that "servers SHOULD maintain the 'creatorsName', 'createTimestamp', 'modifiersName', and 'modifyTimestamp' attributes for all entries of the DIT." This spring Wayne told me the new attribute had come from that comment. In September I asked whether I could brag about it, and he told me to brag away. I am grateful to Linda, to Wayne and to the Active Directory team for picking the comment up. Besides bragging, I wanted to say thank you by testing the attribute. In a single-DC lab I made one controlled write at a time and recorded the attribute before and after each one.



![Wayne McIntyre's reply confirming the feature request](/assets/images/omm-tech-community-reply.png)


*[Screenshot placeholder] The Tech Community reply confirming that the comment led to the feature request and that the attribute is planned for Windows Server 2028.*

## Each object shows who changed its attributes

The base schema defines `msDS-ObjectModifyMetaData` as a constructed attribute. Its `adminDescription` states the design: "A construct attribute that return the metadata that contains the SID or DSA GUID to trace of the last modification of each attributes on the object in readable format."



![ADExplorer showing the ms-DS-Object-Modify-Meta-Data schema definition](/assets/images/omm-adexplorer-schema.png)


*[Screenshot placeholder] The schema definition in ADExplorer: constructed (`systemFlags` 20), single-valued, Unicode string syntax, with the administrative description quoted above.*

The DC computes the value on each read and returns one entry per attribute, in the form `attribute: identity`. The identity is either the SID of a security principal or the GUID of the DC's own NTDS Settings object, its directory service agent (DSA):

```text
objectCategory: S-1-5-21-4048220915-1289918894-3527683120-500
lastLogonTimestamp: {2940B700-0B0E-4464-8E6E-0B0D64B44142}
```

A few lines of PowerShell turn those values into an answer you can read:

```powershell
$dn = 'CN=omm-t1,OU=OMM-Test,DC=corp,DC=internal'
$s  = [adsisearcher]"(distinguishedName=$dn)"
$null = $s.PropertiesToLoad.Add('msDS-ObjectModifyMetaData')

foreach ($v in $s.FindOne().Properties['msds-objectmodifymetadata']) {
    $attr, $id = $v -split ': ', 2
    $who = if ($id -like 'S-1-*') {
        try { ([System.Security.Principal.SecurityIdentifier]$id).Translate([System.Security.Principal.NTAccount]).Value }
        catch { $id }
    } else { "DC (DSA $id)" }
    [pscustomobject]@{ Attribute = $attr; ModifiedBy = $who }
}
```

After a delegated administrator changed the `description` of a user that Administrator had created, the abridged output looked like this:

```text
Attribute          ModifiedBy
---------          ----------
description        CORP\omm-p2
userAccountControl CORP\Administrator
whenCreated        CORP\Administrator
objectClass        CORP\Administrator
```

The output therefore shows the creator on creation-time attributes such as `whenCreated` and `objectClass`, and the last modifier on the rest. In Active Directory that granularity is worth more than a single `modifiersName` per object. The DC rewrites attributes such as `lastLogonTimestamp` on its own, so an object-level modifier would mostly name the system.

Read the attribute with `[adsisearcher]`, raw LDAP or [AdFind 1.64.00](https://www.joeware.net/freetools/tools/adfind/usage.htm), which decodes the DSA GUID as `[ODSA]Site\DC`. The schema declares it single-valued, and `Get-ADObject` returned only the first of the 7 to 40 values I saw on each object. A search filter such as `(msDS-ObjectModifyMetaData=*)` fails, so you query it one object at a time. With a single DC, I could not test how it behaves across replication.

## Attribution follows the write path

For changes made over LDAP, the attribute named the writer's SID on exactly the attributes touched, whether the writer was Administrator or a plain user with delegated rights. That covered creating users, groups and OUs, modifying and clearing values, renames, moves, `gPLink`, unlocking and password resets with `Set-ADAccountPassword`. The last writer wins per attribute, a write that leaves a value unchanged records nothing, and clearing a value leaves an entry naming whoever cleared it. A multi-valued attribute such as `servicePrincipalName` names whoever last added or removed any of its values, and an ACL change is attributed to `nTSecurityDescriptor` as a whole.

Other paths left the DSA GUID in place of a SID, even when the same principals made the changes:

| Write path | Recorded identity |
|---|---|
| LDAP: the ActiveDirectory module, the ADSI LDAP provider the console uses to enable and disable accounts, the Group Policy API | The writer's SID |
| Password set over LDAP (`New-ADUser`, `Set-ADAccountPassword`) | The writer's SID, including on `unicodePwd` |
| Password reset through ADSI `SetPassword`, the console's path, on a DC without LDAPS | DSA |
| SAMR: `net user`, the WinNT provider, `NetUserChangePassword` | DSA, on each attribute the call rewrote |
| The DC's own writes: promotion, logon, lockout | DSA |
| Group membership (`member`) | Nothing |

The DSA cases share one pattern: the change reached the directory through a path that did not carry the caller's identity into the attribute. A single SAMR call by the delegated user rewrote eleven user attributes and replaced their attribution with the DSA. One of them was a `description` the same user had set over LDAP minutes earlier. The console password reset is the case most administrators will meet. [`IADsUser::SetPassword`](https://learn.microsoft.com/en-us/windows/win32/api/iads/nf-iads-iadsuser-setpassword) writes the password over LDAP only when it has an SSL channel, and otherwise falls back to Kerberos and then to `NetUserSetInfo`, which travels over SAMR. My lab DC had no LDAPS, so the reset recorded the DSA, and I have not tested the same reset with LDAPS in place. A DSA GUID therefore names either the DC itself or a caller the attribute did not capture, while a SID names the last principal to write that attribute over LDAP.

## Group membership stays with the event logs

Adding and removing members, by Administrator or by the delegated user, produced no `member` entry at all, and only the per-value replication metadata changed. Comparing the attribute with replication metadata across the test objects showed the same boundary throughout, with non-linked attributes covered and linked attributes left out. For an investigation, the question of who added an account to Domain Admins still belongs to events [4728, 4732 and 4756](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4728).

## Useful for triage, at a cost

[Audit Directory Service Changes](https://learn.microsoft.com/windows/client-management/mdm/policy-csp-audit#dsaccess%5C_auditdirectoryservicechanges) is off by default, and event 5136 also needs SACLs on the objects, so many environments keep no record of who changed an attribute. This attribute gives anyone who can read the object a first answer, but only the last writer per attribute, without a timestamp, old value or history. A later write over SAMR replaces that attribution, so the attribute helps with triage and does not replace audit logs as evidence. Any authenticated user could read it in my tests, so an attacker can also learn who administers which objects. `msDS-ReplAttributeMetaData` never revealed that, because it names only the originating DC. Microsoft documents that [base-schema attributes](https://learn.microsoft.com/windows/win32/ad/restrictions-on-schema-extension) cannot be removed or made defunct, so if the attribute ships as it is, these trade-offs ship together and stay.

## A few suggestions while it is in preview

Because the attribute is still in Insider Preview, a few observations from these tests may be useful before it ships, in the same way the original comment was. Covering linked attributes, starting with `member`, would answer the question investigators most often bring to Active Directory. Where the DC knows the caller during a SAMR call or a password fallback, recording that identity would close the remaining gap. Until then, documenting the current behaviour would stop a DC identity from being read as the DC acting on its own. Restricting who can read the attribute, or at least documenting that any authenticated user can, would balance its forensic value against what it reveals to an attacker. Declaring the attribute multi-valued would let the ActiveDirectory module return every value. A short description of the value format, and of how the attribute behaves across replication, would let other tools read it with confidence.

## Reading it today

For now the rule is short. If the attribute names a SID, that principal was the last to change that attribute over LDAP. If it names the DC, or the attribute is a group's `member`, the event logs are still where the answer lives. All of this describes one Insider Preview build of an undocumented attribute, so some of it may change before Windows Server 2028.
