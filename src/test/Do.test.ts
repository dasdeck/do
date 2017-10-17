/* eslint-env mocha */

import Do from '../Do';
import { cloneDeep, last, isEqual } from 'lodash';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as assert from 'assert';



let mockSettings = cloneDeep(vscode.workspace.getConfiguration('do'));
let commandSpy = sinon.spy(vscode.commands, 'executeCommand');
let shellSpy = sinon.spy(require('child_process'), 'exec');
let createTerminalSpy = sinon.spy(vscode.window, 'createTerminal');
let dispatcher;


describe('ActionDispatcher', () => {

    beforeEach(() => {
        mockSettings.defaultType = "terminal";
        commandSpy.reset();
        shellSpy.reset();
        dispatcher = new Do();
        dispatcher.getSettings = sinon.stub().returns(mockSettings);
    });

    it('simple string command, shell settings', (done) => {

        mockSettings.defaultType = "shell";

        const command = 'echo "hello world"';
        dispatcher.dispatchAction(command, () => {

            assert.equal(shellSpy.called, true);
            assert(shellSpy.args.some(args => isEqual([command], args)));
            done();
        });
    });

    it('simple string command, default setting is terminal', (done) => {

        const command = 'echo "hello world"';
        dispatcher.dispatchAction(command, () => {
            assert.equal(createTerminalSpy.called, true);
            done();
        });
    });

    it('all list items will get executed', (done) => {

        dispatcher.dispatchAction([
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' },
        ], () => {
            assert.equal(commandSpy.callCount, 1);
            done();
        });
    });

    it('2 list items will get executed and sinon knows', (done) => {

        dispatcher.dispatchAction([
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' },
            { 'type': 'command', 'command': 'testCommad', 'args': 'testArgs' }
        ], () => {
            assert.equal(commandSpy.callCount, 2);
            done();
        });
    });

});