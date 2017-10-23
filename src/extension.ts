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
}

export function deactivate() {
}

vscode.window.onDidCloseTerminal(terminal => {

    let term = <any>terminal;
    if (term.action) {
        delete term.action.terminal;
        delete term.action;
    }
});