import ActionDispatcher from '../ActionDispatcher';
import { cloneDeep, last } from 'lodash';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as assert from 'assert';



let mockSettings = cloneDeep(vscode.workspace.getConfiguration('do'));
let commandSpy = sinon.spy(vscode.commands, 'executeCommand');
let shellSpy = sinon.spy(require('child_process'), 'exec');
let dispatcher;


describe('ActionDispatcher', () => {

    beforeEach(() => {
        commandSpy.reset();
        shellSpy.reset();
        dispatcher = new ActionDispatcher();
        dispatcher.getSettings = sinon.stub().returns(mockSettings);
    })

    it('simple string command, shell settings', (done) => {

        mockSettings.defaultType = "shell";

        const command = 'echo "hello world"';
        dispatcher.dispatchAction(command, () => {

            assert.equal(shellSpy.called, true);
            assert.deepEqual(last(shellSpy.args), [command]);
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
    })

})