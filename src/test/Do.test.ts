/* eslint-env mocha */
'use strict';

import Do from '../Do';
import Evaluator from '../Evaluator';
import { cloneDeep, last, isEqual, forEach } from 'lodash';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as assert from 'assert';

const spies = {
    'execSync': < any > require('child_process'),
    'createTerminal': < any > vscode.window,
    'executeCommand': < any > vscode.commands
};

var mockSettings = cloneDeep(vscode.workspace.getConfiguration('do'));
var app;

(Do as any).prototype.getSettings = function() {
    return mockSettings;
};
(Evaluator as any).prototype.getLanguageId = function() {
    return 'javascript';
};

var reactiveProxySetup = {
    ensureProx(data,key){
        const res = data [key];
        if(res && typeof res === 'object' && !(res instanceof Proxy)) {
            data[key] = new Proxy(res,reactiveProxySetup);
        }
    },
    get(data,key,prox) {
        this.ensureProx(data,key);
        return data[key];
    },
    set(data,key,value,prox) {
        data[key] = value;
        app.configChanged();
        return true;
    }
};

var reactiveSettings = new Proxy<any>(mockSettings,reactiveProxySetup );


describe('Do', () => {


    beforeEach(() => {
        forEach(spies, (spy, name) => {

            if (spy.id && spy.id.indexOf('spy') === 0) {
                spy.reset();
            } else {
                try {
                    spies[name] = sinon.spy(spy, name);
                } catch (e) {
                    spies[name] = spies[name][name];
                    spies[name].reset();
                }
            }
        });
        if(app) {
            // app.dispose();
        }
        app = new Do();
        mockSettings.defaultType = "terminal";
    });

    it('reactiveSettings fire' ,() => {

        const configChangedSpy = sinon.spy(app,'configChanged');

        reactiveSettings.defaultType = "test";

        assert.equal(configChangedSpy.callCount, 1);


    });

    it('simple string command, shell settings', done => {

        reactiveSettings.defaultType = "shell";

        const command = 'echo "hello world"';
        app.dispatchAction(command, () => {

            assert.equal(spies.execSync.called, true);
            assert(spies.execSync.args.some(args => isEqual(command, args[0])));
            done();
        });
    });

    it('simple string command, default setting is terminal', done => {

        const command = 'echo "hello world"';
        app.dispatchAction(command, () => {
            assert.equal(spies.createTerminal.callCount, 1);
            done();
        });
    });

    it('all list items will get executed', done => {

        app.dispatchAction([
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' },
        ], () => {
            assert.equal(spies.executeCommand.callCount, 1);
            done();
        });
    });

    it('2 list items will get executed and sinon knows', done => {

        app.dispatchAction([
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' },
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' }
        ], () => {
            assert.equal(spies.executeCommand.callCount, 2);
            done();
        });
    });

    it('conditional commands', done => {

        app.dispatchAction({
            'false': {
                "type": "terminal",
                "command":"echo 'test'"
            }
        }, () => {
            assert.equal(spies.createTerminal.callCount, 0);

            app.dispatchAction({
                'true': {
                    "type": "terminal",
                    "command":"echo 'test'"
                }
            }, () => {
                assert.equal(spies.createTerminal.callCount, 1);
                done();
            });
        });

    });

    it('switch command legacy variables', done => {

        app.dispatchAction({
            '${languageId}': {
                "javascript": "echo 'hi'"
            }
        }, () => {
            assert.equal(spies.createTerminal.callCount, 1);

            app.dispatchAction({
                '${languageId}': {
                    "javascript": ["echo 'hi2'", "echo 'hi3'"],
                    "test": "noop"
                }
            }, () => {
                assert.equal(spies.createTerminal.callCount, 3);
                done();
            });
        });

    });

    it('switch commands', done => {

        app.dispatchAction({
            '"javascript"': {
                "javascript": "echo 'hi'"
            }
        }, () => {
            assert.equal(spies.createTerminal.callCount, 1);

            app.dispatchAction({
                '"javascript"': {
                    "javascript": ["echo 'hi2'", "echo 'hi3'"],
                    "test": "noop"
                }
            }, () => {
                assert.equal(spies.createTerminal.callCount, 3);
                done();
            });
        });

    });

    it('test registering macros', done => {

        reactiveSettings.macros = {'myMacro':'echo "test"'};
        reactiveSettings.registerMacrosAsCommands = false;

        vscode.commands.getCommands().then(commands => {
            assert.equal( commands.indexOf('do.myMacro'), -1);

            reactiveSettings.registerMacrosAsCommands = true;
            vscode.commands.getCommands().then(commands => {
                const index = commands.indexOf('do.myMacro');
                assert.notEqual( index, -1 );

                reactiveSettings.registerMacrosAsCommands = false;
                vscode.commands.getCommands().then(commands => {
                    assert.equal( commands.indexOf('do.myMacro'), -1);
                    done();
                    
                });
            });

        });

    });

    it('test bad commands and actions', done => {
        const catchSpy = sinon.spy();
        const resSpy = sinon.spy();
        app.dispatchAction([{type: 'shell', command: "afsdf"}])
        .then(resSpy)
        .catch( catchSpy )
        .then(res => {
            assert.equal(catchSpy.callCount,1);
            return app.dispatchAction([{'adfaf':'afddaf'}]);
        })
        .catch(catchSpy)
        .then(res => {
            assert.equal(catchSpy.callCount, 2);
            done();
        });
    });


    it('testing docus examples', done => {

        // "key": "ctrl+cmd+a",
        // "command": "do",
        // "args": "echo 'Hello Terminal!'"

        app.dispatchAction("echo 'Hello Terminal!'")
        .then(result => {

        // "key": "ctrl+cmd+b",
        // "command": "do",
        // "args": [
        //     {
        //         "type": "shell",
        //         "command": "echo 'this will be executed in the backgorund (child_process.execSync)'"
        //     },
        //     "echo 'Hello Terminal!'", //same as 1st example
        //     {
        //         "type": "terminal",
        //         "command": "echo 'another, more explixit way of saying Hello Terminal!'"
        //     },
        //     "workbench.action.closeAllEditors" //call a vscode command
        // ]
            return app.dispatchAction([
                    {
                        "type": "shell",
                        "command": "echo 'this will be executed in the backgorund (child_process.execSync)'"
                    },
                    "echo 'Hello Terminal!'", //same as 1st example
                    {
                        "type": "terminal",
                        "command": "echo 'another, more explixit way of saying Hello Terminal!'"
                    },
                    "workbench.action.closeAllEditors" //call a vscode command
                
            ]);
        })
        .then(result => {

           done();
            
        });
        

    });

    it('more readme examples', done => {
         // "do.macros": { 
            //     "showCurrentFileInFinder":{
            //       "type":"shell",
            //       "command":"open ${fileDirname}" // ${fileDirname} will resolve to the currently opened file's directory
            //  }

            reactiveSettings.macros = {
                "showCurrentFileInFinder": {
                    "type":"shell",
                    "command":"open ${fileDirname}" // ${fileDirname} will resolve to the currently opened file's directory
                },
                "doRandomStuff": [
                    'echo "${random} on Terminal"',
                    'showCurrentFileInFinder'
                ]
            };

    
            app.dispatchAction('showCurrentFileInFinder').catch( result => {
                assert.equal(spies.execSync.callCount, 1);
                return Promise.resolve();
            })
            .then(result => {
                return app.dispatchAction('doRandomStuff').catch(result => {
                    assert.equal(spies.createTerminal.called, true);
                    assert.equal(spies.execSync.callCount, 2);
                    done();
                });
            });
    });

});