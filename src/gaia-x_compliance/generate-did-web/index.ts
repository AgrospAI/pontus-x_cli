import { dirname, basename, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { createDidDocument } from '@gaia-x/did-web-generator';

export async function generateDidWeb(baseUrl: string, certificateFilePath: string) {
    const x509 = readFileSync(certificateFilePath, 'utf8');
    const didJson = await createDidDocument(baseUrl, basename(certificateFilePath), x509);
    const folder = dirname(certificateFilePath);
    console.log('Writing DID Web document to ' + resolve(folder, 'did.json'));
    writeFileSync(resolve(folder, 'did.json'), JSON.stringify(didJson, null, 2));
}
