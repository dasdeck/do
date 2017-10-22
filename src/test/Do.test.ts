/* eslint-env mocha */

import Do from '../Do';
import { cloneDeep, last, isEqual, forEach } from 'lodash';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as assert from 'assert';

const spies = {
    'exec': < any > require('child_process'),
    'createTerminal': < any > vscode.window,
    'executeCommand': < any > vscode.commands
};

let mockSettings = cloneDeep(vscode.workspace.getConfiguration('do'));
let dispatcher;

describe('ActionDispatcher', () => {

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
        dispatcher = new Do();
        mockSettings.defaultType = "terminal";
        dispatcher.getSettings = sinon.stub().returns(mockSettings);
    });

    it('simple string command, shell settings', done => {

        mockSettings.defaultType = "shell";

        const command = 'echo "hello world"';
        dispatcher.dispatchAction(command, () => {

            assert.equal(spies.exec.called, true);
            assert(spies.exec.args.some(args => isEqual([command], args)));
            done();
        });
    });

    it('simple string command, default setting is terminal', done => {

        const command = 'echo "hello world"';
        dispatcher.dispatchAction(command, () => {
            assert.equal(spies.createTerminal.callCount, 1);
            done();
        });
    });

    it('all list items will get executed', done => {

        dispatcher.dispatchAction([
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' },
        ], () => {
            assert.equal(spies.executeCommand.callCount, 1);
            done();
        });
    });

    it('2 list items will get executed and sinon knows', done => {

        dispatcher.dispatchAction([
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' },
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' }
        ], () => {
            assert.equal(spies.executeCommand.callCount, 2);
            done();
        });
    });

    it('conditional commands', done => {

        dispatcher.dispatchAction({
            'false': {
                "type": "terminal"
            }
        }, () => {
            assert.equal(spies.createTerminal.callCount, 0);

            dispatcher.dispatchAction({
                'true': {
                    "type": "terminal"
                }
            }, () => {
                assert.equal(spies.createTerminal.callCount, 1);
                done();
            });
        });

    });

    it('switch commands', done => {
        
                dispatcher.dispatchAction({
                    '"javascript"': {
                        "javascript": "echo 'hi'"
                    }
                }, () => {
                    assert.equal(spies.createTerminal.callCount, 1);
                    
                    dispatcher.dispatchAction({
                        '"javascript"':{
                            "javascript":["echo 'hi2'","echo 'hi3'"],
                            "test":"noop"
                        }
                    },() => {
                        assert.equal(spies.createTerminal.callCount, 3);
                        done();
                    });
                });
        
            });

});