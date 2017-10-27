'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import async from 'async';
import Do from './Do';

export default class ActionDispatcher {

    private tempActions = {};
    private app:Do;
    private allCommands: Array < string > = null;
    
    constructor(app:Do) {
        this.app = app;
        
        this.app.log('ready');

        vscode.window.onDidCloseTerminal(terminal => {

            let term = < any > terminal;
            if (term.action) {
                delete term.action.terminal;
                delete term.action;
            }
        });

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
                if (this.app.settings.macros[action]) {
                    this.dispatchAction(this.app.settings.macros[action], done, result);
                } else if (this.allCommands.indexOf(action) >= 0) {
                    this.dispatchAction({ "type": "command", "command": action }, done, result);
                } else {
                    const type = this.app.settings.defaultType || "eval";
                    this.tempActions[action] = this.tempActions[action] || { type, command: action };
                    this.dispatchAction(this.tempActions[action], done, result);
                }
            } else if (typeof action === "object") {
                this.dispatchObject(action, done, result);
            } else {
                this.app.error('action seems malformed:', action);
                if (done) {
                    done(null);
                }
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
                const expression = expressions[0];
                const nextOperation = action[expression];
                let result;
                try {
                    result = this.app.evaluator.eval(expression);
                } catch (e) {
                    if (lastResult && action[lastResult]) {
                        this.dispatchAction(action[lastResult], done, result);
                        return;
                    } else if (action.default) {
                        this.dispatchAction(action.default, done, result);
                    } else if (lastResult && !action.default) {
                        this.app.error("no switch case for handling:", lastResult, action);
                        done();
                        return;
                    } else {
                        this.app.error("possible expression error: ", expression, e, action);
                        done();
                        return;
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
                } else if (action.default) {
                    this.dispatchAction(action.default, done, lastResult);
                } else {
                    this.app.error("switch value not found for: ", lastResult, 'in: ', action);
                    done();
                }
            } else {
                this.app.error('command seems malformed:', action);
                if (done) {
                    done(null);
                }
            }
        }

    }

    protected dispatchActionObject(action, done, result) {

        const quotedTypes = ['eval'];
        if (!action.command) {
            this.app.error('the action:', action, 'has no command!');
        } else {
            action.command = Array.isArray(action.command) ?
                action.command.join('\n') :
                action.command;
            action.command = this.app.evaluator.resolveConfigVars(action.command, quotedTypes.indexOf(action.type) < 0);
        }

        switch (action.type) {
            case 'shell':
                cp.exec(action.command).on('exit', done);
                break;
            case 'terminal':
                action.terminal = action.terminal || vscode.window.createTerminal("Do:" + action.command);
                action.terminal.action = action;
                action.terminal.show();
                vscode.commands.executeCommand("workbench.action.terminal.clear");
                action.terminal.sendText(action.command);
                done();
                break;
            case 'eval':
                try {
                    this.app.evaluator.eval(action.command);
                } catch (e) {
                    this.app.error('eval error:', e.message);
                }

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


}