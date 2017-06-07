/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
const should = require('chai').should();
const fs = require('fs');
const ac = require('../index.js');
const AssetCheck = ac.AssetCheck;
const LOG_LEVEL = ac.LOG_SILENT;

var getTestFile = function(filename) {
  return fs.readFileSync(process.cwd() + '/test/data/' + filename);
}

describe('#AssetCheck', function() {
  var asset = new AssetCheck('foo', LOG_LEVEL);

  it('parses simple json', function() {
    asset.handleParseJson(
        getTestFile('simple-pass.json'),
        (data) => {
          data.should.not.be.null;
        },
        (err) => {
          throw new Error('Should not have failed.');
        });
  })

  it('rejects invalid json', function() {
    asset.handleParseJson(
        getTestFile('simple-fail.json'),
        (data) => {
          throw new Error('Should not have passed.');
        },
        (err) => {
          err.should.not.be.null;
        });
  })

  xit('rejects json with a byte order mark', function() {
    asset.handleParseJson(
        getTestFile('invalid-byte-order-mark.json'),
        (data) => {
          throw new Error('Should not have passed.');
        },
        (err) => {
          err.should.equal(
              'File must be UTF-8 encoded _without_ a byte order mark (BOM)');
        });
  });

  it('rejects missing namespace from target', function() {
    asset.handleParseJson(
        getTestFile('missing-target-namespace-fail.json'),
        (data) => {
          throw new Error('Should not have passed.');
        },
        (err) => {
          err.should.not.be.null;
        });
  })

  it('rejects unkown namespace from target', function() {
    asset.handleParseJson(
        getTestFile('unkown-target-namespace-fail.json'),
        (data) => {
          throw new Error('Should not have passed.');
        },
        (err) => {
          err.should.not.be.null;
        });
  })
})
