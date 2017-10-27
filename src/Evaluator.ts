'use strict';
import * as path from 'path';
import * as vscode from 'vscode';

export default class Evaluator {
    protected getLanguageId() {
        return vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.languageId : '';
    }

    protected getVariables() {
        return {
            "languageId": this.getLanguageId(),
            "file": vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName : '',
            "fileDirname": vscode.window.activeTextEditor ? path.dirname(vscode.window.activeTextEditor.document.fileName) : '',
            "workspaceFolder": vscode.workspace.rootPath ? vscode.workspace.rootPath : "."
        };
    }

    public eval(expression) {
        const map = this.getVariables();

        //clean up template variable usage
        expression = this.resolveConfigVars(expression, false);

        const res = (new Function(`with(this)
        {
            return ${expression};
        }`).bind(map))();
        return res;

    }

    public resolveConfigVars(input, replaceWithValue: boolean = true) {

        const map = this.getVariables();
        Object.keys(map).forEach(needle => {
            const replace = replaceWithValue ? map[needle] : needle;
            needle = '${' + needle + '}';
            input = input.split(needle).join(replace);
        });
        return input;
    }
}