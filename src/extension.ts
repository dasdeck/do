'use strict';
import * as vscode from 'vscode';
import Do from './Do';
import ActionCue from './ActionCue';



const doInstance = new Do();
const cue = new ActionCue();
export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('do', (args) => {

        cue.push(done => {
            doInstance.dispatchAction(args, () => {
                done();
                doInstance.log('done:', args);
            });
        });

    });

    if (doInstance.settings.onStart) {
        doInstance.dispatchAction(doInstance.settings.onStart);
    }

    context.subscriptions.push(disposable);

    vscode.window.registerTreeDataProvider('do.macros', new TreeSource());
}

export function deactivate() {

}

