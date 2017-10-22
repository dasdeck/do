import * as vscode from 'vscode';

interface ActionCallback {
    (done: Function, res ? : any): void; }
export default class ActionCue {

    private actions: Array < ActionCallback > = [];

    private running: boolean = false;

    private listeners: Array < Function > = [];

    public push(action: ActionCallback, done ? : Function) {
        this.actions.push(action);
        if (done) {
            this.listeners.push(done);
        }
        this.start();
    }

    private start() {
        if (!this.running && this.actions.length) {
            this.running = true;
            this.step();
        }
    }

    private step(res ? : any) {
        if (this.actions.length) {
            const action = this.actions.shift();
            action((res) => this.step(res), res);
        } else {
            this.running = false;
            this.listeners.forEach(done => done());
        }

    }
}