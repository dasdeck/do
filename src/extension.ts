'use strict';
import * as vscode from 'vscode';
import Do from './Do';


export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(new Do());

}

export function deactivate(context: vscode.ExtensionContext) {
    
}

