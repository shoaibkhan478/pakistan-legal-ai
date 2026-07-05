# court_decrees/

Drop your source legal documents here as `.txt`, `.pdf`, or `.docx` files.

## Naming convention (required — the ingestion script parses this)

```
constitution__Article_199__Right_to_Constitutional_Remedy.txt
statute__PPC__Section_302__Qatl-e-amd.txt
judgment__PLD_2012_SC_553__Benazir_Bhutto_v_Federation.pdf
```

Format: `type__identifier1__identifier2.ext`

- `constitution__<Article_Number>__<Title>`
- `statute__<StatuteName>__<Section_Number>__<Title>`
- `judgment__<Citation>__<CaseTitle>`

Use underscores instead of spaces. Once files are in place, run:

```bash
node backend/scripts/ingestLegalDocs.js
```
