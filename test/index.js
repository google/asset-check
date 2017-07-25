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
const AssetFile = ac.AssetFile;
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

  it('accepts include statements', function() {
    asset.handleParseJson(
        getTestFile('include-pass.json'),
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

  it('rejects multiple include statements', function() {
    asset.handleParseJson(
        getTestFile('multiple-include-fail.json'),
        (data) => {
          throw new Error('Should not have passed.');
        },
        (err) => {
          err.should.not.be.null;
        });
  })

  it('rejects mixing include and target statements', function() {
    asset.handleParseJson(
        getTestFile('include-target-fail.json'),
        (data) => {
          throw new Error('Should not have passed.');
        },
        (err) => {
          err.should.not.be.null;
        });
  })
});

describe('#AssetFile', function() {
  it('allows local filenames', function() {
    var testData = ['./local-file.txt', 'assetlinks.json',
      "../../path/to/local/file.json",
      "../https/www.foo.com/.well-known/assetlinks.json"];

    for (var i in testData) {
      var testAssetFile = new AssetFile(testData[i]);
      testAssetFile.getFilename().should.equal(testData[i]);
    }
  });

  it('enforces https protocol', function() {
    var testData = ['http://www.example.com/', 'http://www.google.com',
      "http://foo.bar"];
    for (var i in testData) {
      var testAssetFile = new AssetFile(testData[i]);
      testAssetFile.getFilename().should.contain("https://");
      testAssetFile.getFilename().should.not.contain("http://");
    }
  });

  it("should rewrite missing paths", function() {
    var testData = {
      'https://www.example.com/': 'https://www.example.com/.well-known/assetlinks.json',
      'https://www.google.com': 'https://www.google.com/.well-known/assetlinks.json',
      'https://foo.bar': 'https://foo.bar/.well-known/assetlinks.json'};
    for (var filename in testData) {
      var testAssetFile = new AssetFile(filename);
      testAssetFile.getFilename().should.equal(testData[filename]);
    }
  });


  it("doesn't rewrite absolute paths", function() {
    var testData = ['https://www.example.com/asset-links.json',
      'https://www.google.com/path/to/specific/file.json',
      "https://foo.bar/file.txt"];

    for (var i in testData) {
      var testAssetFile = new AssetFile(testData[i]);
      testAssetFile.getFilename().should.equal(testData[i]);
    }
  });
});