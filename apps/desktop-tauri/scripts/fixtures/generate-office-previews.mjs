/** Regenerate synthetic release documents with the existing Web preview fixtures: node --import tsx <this file>. */
import { writeFileSync } from 'node:fs'
import { realOfficeBytes } from '../../../web/tests/office-fixture.ts'
import { pdfFixture } from '../../../../packages/client/ui-sidebar-documentpreview/tests/pdf-fixture.ts'
import { excelFixture } from '../../../../packages/client/ui-sidebar-documentpreview/tests/excel-fixture.ts'

for (const [extension, bytes] of [
  ['pdf', pdfFixture()],
  ['docx', realOfficeBytes('docx')],
  ['pptx', realOfficeBytes('pptx')],
  ['xlsx', await excelFixture()],
]) {
  writeFileSync(new URL(`release-office-preview.${extension}`, import.meta.url), bytes)
}
