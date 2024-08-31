export function packageVersion(): string {
    let packageJson;
    try {
        // Try to require the local package.json
        packageJson = require('../../package.json');
    } catch (localError) {
        try {
            // If local package.json is not found, require it from the installed package
            packageJson = require('pontus-x_cli/package.json');
        } catch (packageError) {
            console.error('Error: package.json not found locally or in the installed package.');
            process.exit(1);
        }
    }
    return packageJson.version;
}
