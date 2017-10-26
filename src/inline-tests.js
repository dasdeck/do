import * as testRunner from 'vscode/lib/testrunner';
import * as path from 'path';
import * as glob from 'glob';
import * as vscode from 'vscode';

function runTests() {

    glob.sync(path.join(__dirname, 'test', '**/*.test.js')).forEach(element => {
        delete require.cache[element];
    });
    testRunner.configure({
        ui: 'tdd', // the TDD UI is being used in extension.test.ts (suite, test, etc.)
        useColors: true,
        timeout: 1000000 // colored output from test results
    });

    testRunner.run(path.join(__dirname, 'test'), err => {

        if (err) {
            console.log(err);
        }
    });
}

// const source = path.join(__dirname, '**', '*.js');
let watcher = vscode.workspace.createFileSystemWatcher('**/*.js');

watcher.onDidChange(() => {
    runTests();
});
runTests();