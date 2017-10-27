'use strict';

import * as assert from 'assert';
import ActionCue from '../ActionCue';

describe('ActionCue', () => { 

    let cue;

    beforeEach(() => {
        cue = new ActionCue();
    });

    it('allActions are performed', done => {

        cue.push( done => setTimeout(done,100), done);
        cue.push(done => done());

    });
});
    