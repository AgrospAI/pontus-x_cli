import { argv } from 'process';
import { dirname, basename, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { createDidDocument } from '@gaia-x/did-web-generator';

async function generateDidWeb(baseUrl: string, certificateFilePath: string) {
    const x509 = readFileSync(certificateFilePath, 'utf8');
    const didJson = await createDidDocument(baseUrl, basename(certificateFilePath), x509);
    const folder = dirname(certificateFilePath);
    console.log('Writing DID Web document to ' + resolve(folder, 'did.json'));
    writeFileSync(resolve(folder, 'did.json'), JSON.stringify(didJson, null, 2));
}

if (argv.length < 3) {
    console.log('Usage: npm run generate-did-web -- <baseUrl> <certificateFileName>');
    process.exit(1);
} else {
    console.log('Generating DID Web document for ' + argv[2] + ' with certificate ' + argv[3]);
    generateDidWeb(argv[2], argv[3]).then(r => console.log('Done'));
}
