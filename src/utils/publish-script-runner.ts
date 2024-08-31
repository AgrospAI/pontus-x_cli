import * as fs from 'fs';
import * as vm from 'vm';
import * as ts from 'typescript';

export async function invokeFunctionFromFile(filePath: string, functionName: string, ...args: any[]) {
    // Read the TypeScript file content
    const tsContent = fs.readFileSync(filePath, 'utf8');

    // Transpile TypeScript to JavaScript
    const jsContent = ts.transpileModule(tsContent, {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;

    // Create a new context for the script
    const script = new vm.Script(jsContent);
    const context = vm.createContext({ require, console, module, exports });

    // Run the script in the context
    script.runInContext(context);

    // Invoke the function by name
    if (typeof context[functionName] === 'function') {
        return context[functionName](...args);
    } else {
        throw new Error(`Function ${functionName} not found in ${filePath}`);
    }
}
