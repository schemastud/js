---
'@schemastud/frame': patch
---

The generic list table no longer clips a wide list on a narrow screen: below 768px each record renders as a stacked
card (first column the heading, the others labelled fields, row actions the footer), and at desktop width the table's
wrapper scrolls sideways (`overflow-x-auto`) instead of hiding its right edge (`overflow-hidden`).
