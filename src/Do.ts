import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import async from 'async';

export default class ActionDispatcher {

    private getSettings(): any {
        return vscode.workspace.getConfiguration('do');

    }
    public get settings(): any {
        return this.getSettings();
    }

    private allCommands: Array < string > = null;
    private tempActions = {};

    constructor() {
        vscode.window.showInformationMessage('do:ready!');
    }

    public dispatchAction(action: Array < any > | Object | String, done ? : (result) => (any), result ? : any) {

        if (!this.allCommands) {
            this.loadCommands(() => {
                this.dispatchAction(action, done, result);
            });
        } else {
            if (Array.isArray(action)) {
                this.dispatchAcionList(action, done, result);
            } else if (typeof action === 'string') {
                if (this.settings.macros[action]) {
                    this.dispatchAction(this.settings.macros[action], done, result);
                } else if (this.allCommands.indexOf(action) >= 0) {
                    vscode.commands.executeCommand(action).then(done);
                } else {
                    const type = this.settings.defaultType || "eval";
                    this.tempActions[action] = this.tempActions[action] || { type, command: action };
                    this.dispatchAction(this.tempActions[action], done, result);
                }
            } else if (typeof action === "object") {
                this.dispatchObject(action, done, result);
            }
        }
    }

    protected dispatchAcionList(list, done, result) {
        let jobs = [];
        if (!this.allCommands) {
            jobs.push(done => this.loadCommands(done));
        }
        list.forEach(action => {
            jobs.push(done => this.dispatchAction(action, done));
        });
        if (done) {
            jobs.push(() => {
                done();
            });
        }
        async.series(jobs);
    }

    protected dispatchObject(action, done, lastResult) {

        if (action.type) {

            this.dispatchActionObject(action, done, lastResult);
        } else {
            const expressions = Object.keys(action);
            if (expressions.length === 1) {
                const expression = this.resolveConfigVars(expressions[0]);
                const nextOperation = action[expression];
                let result;
                try {
                    result = eval(expression);
                } catch (e) {
                    if (lastResult && action[lastResult]) {
                        this.dispatchAction(action[lastResult], done, result);
                        return;
                    } else {
                        vscode.window.showErrorMessage("do: expression error:", e.message);
                    }
                }

                if (result) {
                    this.dispatchAction(action[expression], done, result);
                } else {
                    done();
                }
            } else if (expressions.length > 1) {
                if (lastResult && action[lastResult]) {
                    this.dispatchAction(action[lastResult], done);
                } else {

                }
            }
        }

    }

    protected dispatchActionObject(action, done, result) {

        if (!action.command) {
            vscode.window
                .showErrorMessage("do: action objects need a command:" + JSON.stringify(action))
                .then(done);
        } else {
            action.command = Array.isArray(action.command) ?
                action.command.join('\n') :
                action.command;
            action.command = this.resolveConfigVars(action.command);
        }

        switch (action.type) {
            case 'shell':
                cp.exec(action.command).on('exit', done);
                break;
            case 'terminal':
                action.terminal = action.terminal || vscode.window.createTerminal("do:" + action.command);
                action.terminal.action = action;
                action.terminal.show();
                vscode.commands.executeCommand("workbench.action.terminal.clear");
                action.terminal.sendText(action.command);
                done();
                break;
            case 'eval':
                eval(action.command);
                done();
                break;
            case 'task':
                this.dispatchAction({
                    type: 'command',
                    command: 'workbench.action.tasks.runTask',
                    args: 'action.command'
                }, done);
                break;
            case 'alert':
                vscode.window.showErrorMessage(action.command)
                    .then(done);
            case 'command':
            default:
                vscode.commands.executeCommand(action.command, action.args).then(() => {
                    done();
                }, () => {
                    done();
                });
        }
    }

    protected loadCommands(done) {
        vscode.commands.getCommands().then(newAllCommands => {
            this.allCommands = newAllCommands;
            if (done) {
                done();
            }
        });
    }

    protected resolveConfigVars(input) {
        const map = {
            "${languageId}": vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.languageId : '',
            "${file}": vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName : '',
            "${fileDirname}": vscode.window.activeTextEditor ? path.dirname(vscode.window.activeTextEditor.document.fileName) : '',
            "${workspaceFolder}": vscode.workspace.rootPath ? vscode.workspace.rootPath : "."
        };
        Object.keys(map).forEach(needle => {
            const replace = map[needle];
            input = input.split(needle).join(replace);
        });
        return input;
    }
}