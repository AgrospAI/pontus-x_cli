import fs from 'fs';
import readlineSync from 'readline-sync';
import wallet from 'ethereumjs-wallet';

function main() {
    const pk = readlineSync.question('\nExporting your private key as a JSON file... \n' +
        'First, get a copy of your private key from Metamask.\n' +
        '\t 1.) On the upper right menu, select "Account details", then "Show private key". \n' +
        '\t 2.) After providing your MetaMask password and revealing, click the button to copy it. \n' +
        '\t 3.) Then, please, paste your private key here: ', {hideEchoBack: true});

    const pkBuffer = Buffer.from(pk, 'hex');
    const account = wallet.fromPrivateKey(pkBuffer);

    const password = readlineSync.question(
        'Finally, to securely store your private key, please, enter a password to encrypt it: ',
        {hideEchoBack: true});

    const address = account.getAddress().toString('hex')
    console.log(`Generating encrypted file to store your private key, which corresponds to you account ${address}`);

    account.toV3(password).then(value => {
        const file = `${address}.json`
        fs.writeFileSync(file, JSON.stringify(value))
        console.log(`Your encrypted private key has been saved to ${file}\n`);
    });
}

try {
    main();
} catch (e) {
    if (e instanceof Error) {
        console.error(e.message + '\n');
    } else {
        console.error(e)
    }
}
