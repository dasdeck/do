'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import async from 'async';
import Do from './Do';

interface nodeCallback { (err?: any,res?:any): void; }

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

    public configChanged() {
        delete this.allCommands;
    }

    public dispatchAction(action: Array < any > | Object | String, done ? : nodeCallback, result ? : any) {

        if (!this.allCommands) {
            this.loadCommands(() => {
                this.dispatchAction(action, done, result);
            });
        } else {
            if (Array.isArray(action)) {
                this.dispatchAction({type:'array',command:action}, done, result);
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

    protected dispatchAcionList(action, done, result) {

        const list = action.command;
        let jobs = [];

        if (!this.allCommands) {
            jobs.push(done => this.loadCommands(done));
        }
        list.forEach(action => {
            jobs.push(done => this.dispatchAction(action, done));
        });
       
        async.series(jobs, (err,res) => {
            done(err, res);
        });
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
                        done(e);
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

    private stringifyCommand(command, evaluate = false) {
        command = Array.isArray(command) ?  command.join('\n') : command;
        return this.app.evaluator.resolveConfigVars(command, evaluate);
    }

    protected dispatchActionObject(action, done, result) {

        const quotedTypes = ['eval'];
        if (!action.command) {
            const e = this.app.error('the action:', action, 'has no command!');
            done(e);
            return;
        } 

        switch (action.type) {
            case 'array':
                this.dispatchAcionList(action, done, result);
                break;
            case 'shell':
                try {
                    const command = this.stringifyCommand(action.command);
                    const res = cp.execSync(command, {encoding: 'utf8'});
                    done(null, res);
                } catch (e) {
                    done(e);
                }
                break;
            case 'terminal':
            {
                const command = this.stringifyCommand(action.command);
                action.terminal = action.terminal || vscode.window.createTerminal("Do:" + command);
                action.terminal.action = action;
                action.terminal.show();
                vscode.commands.executeCommand("workbench.action.terminal.clear");
                action.terminal.sendText(command);
                done();
                break;
            }
            case 'eval':
                try {
                    const command = this.stringifyCommand(action.command, false);
                    const res = this.app.evaluator.eval(command);
                    done(null,res);
                    
                } catch (e) {
                    this.app.error('eval error:', e.message);
                    done(e);
                }
                break;
            case 'task':
            {
                const command = this.stringifyCommand(action.command);
                this.dispatchAction({
                    type: 'command',
                    command: 'workbench.action.tasks.runTask',
                    args: command
                }, done);
                break;
            }
            case 'alert':
                const command = this.stringifyCommand(action.command);
                vscode.window.showErrorMessage(command)
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