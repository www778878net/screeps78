'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var sourceMapGenerator = {};

var base64Vlq = {};

var base64$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
base64$1.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
base64$1.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = base64$1;

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
base64Vlq.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
base64Vlq.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

var util$5 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

(function (exports) {
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	/**
	 * This is a helper function for getting values from parameter/options
	 * objects.
	 *
	 * @param args The object we are extracting values from
	 * @param name The name of the property we are getting.
	 * @param defaultValue An optional value to return if the property is missing
	 * from the object. If this is not specified and the property is missing, an
	 * error will be thrown.
	 */
	function getArg(aArgs, aName, aDefaultValue) {
	  if (aName in aArgs) {
	    return aArgs[aName];
	  } else if (arguments.length === 3) {
	    return aDefaultValue;
	  } else {
	    throw new Error('"' + aName + '" is a required argument.');
	  }
	}
	exports.getArg = getArg;

	var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
	var dataUrlRegexp = /^data:.+\,.+$/;

	function urlParse(aUrl) {
	  var match = aUrl.match(urlRegexp);
	  if (!match) {
	    return null;
	  }
	  return {
	    scheme: match[1],
	    auth: match[2],
	    host: match[3],
	    port: match[4],
	    path: match[5]
	  };
	}
	exports.urlParse = urlParse;

	function urlGenerate(aParsedUrl) {
	  var url = '';
	  if (aParsedUrl.scheme) {
	    url += aParsedUrl.scheme + ':';
	  }
	  url += '//';
	  if (aParsedUrl.auth) {
	    url += aParsedUrl.auth + '@';
	  }
	  if (aParsedUrl.host) {
	    url += aParsedUrl.host;
	  }
	  if (aParsedUrl.port) {
	    url += ":" + aParsedUrl.port;
	  }
	  if (aParsedUrl.path) {
	    url += aParsedUrl.path;
	  }
	  return url;
	}
	exports.urlGenerate = urlGenerate;

	/**
	 * Normalizes a path, or the path portion of a URL:
	 *
	 * - Replaces consecutive slashes with one slash.
	 * - Removes unnecessary '.' parts.
	 * - Removes unnecessary '<dir>/..' parts.
	 *
	 * Based on code in the Node.js 'path' core module.
	 *
	 * @param aPath The path or url to normalize.
	 */
	function normalize(aPath) {
	  var path = aPath;
	  var url = urlParse(aPath);
	  if (url) {
	    if (!url.path) {
	      return aPath;
	    }
	    path = url.path;
	  }
	  var isAbsolute = exports.isAbsolute(path);

	  var parts = path.split(/\/+/);
	  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
	    part = parts[i];
	    if (part === '.') {
	      parts.splice(i, 1);
	    } else if (part === '..') {
	      up++;
	    } else if (up > 0) {
	      if (part === '') {
	        // The first part is blank if the path is absolute. Trying to go
	        // above the root is a no-op. Therefore we can remove all '..' parts
	        // directly after the root.
	        parts.splice(i + 1, up);
	        up = 0;
	      } else {
	        parts.splice(i, 2);
	        up--;
	      }
	    }
	  }
	  path = parts.join('/');

	  if (path === '') {
	    path = isAbsolute ? '/' : '.';
	  }

	  if (url) {
	    url.path = path;
	    return urlGenerate(url);
	  }
	  return path;
	}
	exports.normalize = normalize;

	/**
	 * Joins two paths/URLs.
	 *
	 * @param aRoot The root path or URL.
	 * @param aPath The path or URL to be joined with the root.
	 *
	 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
	 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
	 *   first.
	 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
	 *   is updated with the result and aRoot is returned. Otherwise the result
	 *   is returned.
	 *   - If aPath is absolute, the result is aPath.
	 *   - Otherwise the two paths are joined with a slash.
	 * - Joining for example 'http://' and 'www.example.com' is also supported.
	 */
	function join(aRoot, aPath) {
	  if (aRoot === "") {
	    aRoot = ".";
	  }
	  if (aPath === "") {
	    aPath = ".";
	  }
	  var aPathUrl = urlParse(aPath);
	  var aRootUrl = urlParse(aRoot);
	  if (aRootUrl) {
	    aRoot = aRootUrl.path || '/';
	  }

	  // `join(foo, '//www.example.org')`
	  if (aPathUrl && !aPathUrl.scheme) {
	    if (aRootUrl) {
	      aPathUrl.scheme = aRootUrl.scheme;
	    }
	    return urlGenerate(aPathUrl);
	  }

	  if (aPathUrl || aPath.match(dataUrlRegexp)) {
	    return aPath;
	  }

	  // `join('http://', 'www.example.com')`
	  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
	    aRootUrl.host = aPath;
	    return urlGenerate(aRootUrl);
	  }

	  var joined = aPath.charAt(0) === '/'
	    ? aPath
	    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

	  if (aRootUrl) {
	    aRootUrl.path = joined;
	    return urlGenerate(aRootUrl);
	  }
	  return joined;
	}
	exports.join = join;

	exports.isAbsolute = function (aPath) {
	  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
	};

	/**
	 * Make a path relative to a URL or another path.
	 *
	 * @param aRoot The root path or URL.
	 * @param aPath The path or URL to be made relative to aRoot.
	 */
	function relative(aRoot, aPath) {
	  if (aRoot === "") {
	    aRoot = ".";
	  }

	  aRoot = aRoot.replace(/\/$/, '');

	  // It is possible for the path to be above the root. In this case, simply
	  // checking whether the root is a prefix of the path won't work. Instead, we
	  // need to remove components from the root one by one, until either we find
	  // a prefix that fits, or we run out of components to remove.
	  var level = 0;
	  while (aPath.indexOf(aRoot + '/') !== 0) {
	    var index = aRoot.lastIndexOf("/");
	    if (index < 0) {
	      return aPath;
	    }

	    // If the only part of the root that is left is the scheme (i.e. http://,
	    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
	    // have exhausted all components, so the path is not relative to the root.
	    aRoot = aRoot.slice(0, index);
	    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
	      return aPath;
	    }

	    ++level;
	  }

	  // Make sure we add a "../" for each component we removed from the root.
	  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
	}
	exports.relative = relative;

	var supportsNullProto = (function () {
	  var obj = Object.create(null);
	  return !('__proto__' in obj);
	}());

	function identity (s) {
	  return s;
	}

	/**
	 * Because behavior goes wacky when you set `__proto__` on objects, we
	 * have to prefix all the strings in our set with an arbitrary character.
	 *
	 * See https://github.com/mozilla/source-map/pull/31 and
	 * https://github.com/mozilla/source-map/issues/30
	 *
	 * @param String aStr
	 */
	function toSetString(aStr) {
	  if (isProtoString(aStr)) {
	    return '$' + aStr;
	  }

	  return aStr;
	}
	exports.toSetString = supportsNullProto ? identity : toSetString;

	function fromSetString(aStr) {
	  if (isProtoString(aStr)) {
	    return aStr.slice(1);
	  }

	  return aStr;
	}
	exports.fromSetString = supportsNullProto ? identity : fromSetString;

	function isProtoString(s) {
	  if (!s) {
	    return false;
	  }

	  var length = s.length;

	  if (length < 9 /* "__proto__".length */) {
	    return false;
	  }

	  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
	      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
	      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
	      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
	      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
	      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
	      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
	      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
	      s.charCodeAt(length - 9) !== 95  /* '_' */) {
	    return false;
	  }

	  for (var i = length - 10; i >= 0; i--) {
	    if (s.charCodeAt(i) !== 36 /* '$' */) {
	      return false;
	    }
	  }

	  return true;
	}

	/**
	 * Comparator between two mappings where the original positions are compared.
	 *
	 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
	 * mappings with the same original source/line/column, but different generated
	 * line and column the same. Useful when searching for a mapping with a
	 * stubbed out mapping.
	 */
	function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
	  var cmp = strcmp(mappingA.source, mappingB.source);
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.originalLine - mappingB.originalLine;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.originalColumn - mappingB.originalColumn;
	  if (cmp !== 0 || onlyCompareOriginal) {
	    return cmp;
	  }

	  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.generatedLine - mappingB.generatedLine;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  return strcmp(mappingA.name, mappingB.name);
	}
	exports.compareByOriginalPositions = compareByOriginalPositions;

	/**
	 * Comparator between two mappings with deflated source and name indices where
	 * the generated positions are compared.
	 *
	 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
	 * mappings with the same generated line and column, but different
	 * source/name/original line and column the same. Useful when searching for a
	 * mapping with a stubbed out mapping.
	 */
	function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
	  var cmp = mappingA.generatedLine - mappingB.generatedLine;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
	  if (cmp !== 0 || onlyCompareGenerated) {
	    return cmp;
	  }

	  cmp = strcmp(mappingA.source, mappingB.source);
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.originalLine - mappingB.originalLine;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.originalColumn - mappingB.originalColumn;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  return strcmp(mappingA.name, mappingB.name);
	}
	exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

	function strcmp(aStr1, aStr2) {
	  if (aStr1 === aStr2) {
	    return 0;
	  }

	  if (aStr1 === null) {
	    return 1; // aStr2 !== null
	  }

	  if (aStr2 === null) {
	    return -1; // aStr1 !== null
	  }

	  if (aStr1 > aStr2) {
	    return 1;
	  }

	  return -1;
	}

	/**
	 * Comparator between two mappings with inflated source and name strings where
	 * the generated positions are compared.
	 */
	function compareByGeneratedPositionsInflated(mappingA, mappingB) {
	  var cmp = mappingA.generatedLine - mappingB.generatedLine;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = strcmp(mappingA.source, mappingB.source);
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.originalLine - mappingB.originalLine;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  cmp = mappingA.originalColumn - mappingB.originalColumn;
	  if (cmp !== 0) {
	    return cmp;
	  }

	  return strcmp(mappingA.name, mappingB.name);
	}
	exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

	/**
	 * Strip any JSON XSSI avoidance prefix from the string (as documented
	 * in the source maps specification), and then parse the string as
	 * JSON.
	 */
	function parseSourceMapInput(str) {
	  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
	}
	exports.parseSourceMapInput = parseSourceMapInput;

	/**
	 * Compute the URL of a source given the the source root, the source's
	 * URL, and the source map's URL.
	 */
	function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
	  sourceURL = sourceURL || '';

	  if (sourceRoot) {
	    // This follows what Chrome does.
	    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
	      sourceRoot += '/';
	    }
	    // The spec says:
	    //   Line 4: An optional source root, useful for relocating source
	    //   files on a server or removing repeated values in the
	    //   “sources” entry.  This value is prepended to the individual
	    //   entries in the “source” field.
	    sourceURL = sourceRoot + sourceURL;
	  }

	  // Historically, SourceMapConsumer did not take the sourceMapURL as
	  // a parameter.  This mode is still somewhat supported, which is why
	  // this code block is conditional.  However, it's preferable to pass
	  // the source map URL to SourceMapConsumer, so that this function
	  // can implement the source URL resolution algorithm as outlined in
	  // the spec.  This block is basically the equivalent of:
	  //    new URL(sourceURL, sourceMapURL).toString()
	  // ... except it avoids using URL, which wasn't available in the
	  // older releases of node still supported by this library.
	  //
	  // The spec says:
	  //   If the sources are not absolute URLs after prepending of the
	  //   “sourceRoot”, the sources are resolved relative to the
	  //   SourceMap (like resolving script src in a html document).
	  if (sourceMapURL) {
	    var parsed = urlParse(sourceMapURL);
	    if (!parsed) {
	      throw new Error("sourceMapURL could not be parsed");
	    }
	    if (parsed.path) {
	      // Strip the last path component, but keep the "/".
	      var index = parsed.path.lastIndexOf('/');
	      if (index >= 0) {
	        parsed.path = parsed.path.substring(0, index + 1);
	      }
	    }
	    sourceURL = join(urlGenerate(parsed), sourceURL);
	  }

	  return normalize(sourceURL);
	}
	exports.computeSourceURL = computeSourceURL;
} (util$5));

var arraySet = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$4 = util$5;
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet$2() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet$2.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet$2();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet$2.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet$2.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util$4.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet$2.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util$4.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet$2.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
  } else {
    var sStr = util$4.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet$2.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet$2.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

arraySet.ArraySet = ArraySet$2;

var mappingList = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$3 = util$5;

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA ||
         util$3.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
function MappingList$1() {
  this._array = [];
  this._sorted = true;
  // Serves as infimum
  this._last = {generatedLine: -1, generatedColumn: 0};
}

/**
 * Iterate through internal items. This method takes the same arguments that
 * `Array.prototype.forEach` takes.
 *
 * NOTE: The order of the mappings is NOT guaranteed.
 */
MappingList$1.prototype.unsortedForEach =
  function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };

/**
 * Add the given source mapping.
 *
 * @param Object aMapping
 */
MappingList$1.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;
    this._array.push(aMapping);
  } else {
    this._sorted = false;
    this._array.push(aMapping);
  }
};

/**
 * Returns the flat, sorted array of mappings. The mappings are sorted by
 * generated position.
 *
 * WARNING: This method returns internal data without copying, for
 * performance. The return value must NOT be mutated, and should be treated as
 * an immutable borrow. If you want to take ownership, you must make your own
 * copy.
 */
MappingList$1.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util$3.compareByGeneratedPositionsInflated);
    this._sorted = true;
  }
  return this._array;
};

mappingList.MappingList = MappingList$1;

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var base64VLQ$1 = base64Vlq;
var util$2 = util$5;
var ArraySet$1 = arraySet.ArraySet;
var MappingList = mappingList.MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
function SourceMapGenerator$1(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util$2.getArg(aArgs, 'file', null);
  this._sourceRoot = util$2.getArg(aArgs, 'sourceRoot', null);
  this._skipValidation = util$2.getArg(aArgs, 'skipValidation', false);
  this._sources = new ArraySet$1();
  this._names = new ArraySet$1();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}

SourceMapGenerator$1.prototype._version = 3;

/**
 * Creates a new SourceMapGenerator based on a SourceMapConsumer
 *
 * @param aSourceMapConsumer The SourceMap.
 */
SourceMapGenerator$1.fromSourceMap =
  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator$1({
      file: aSourceMapConsumer.file,
      sourceRoot: sourceRoot
    });
    aSourceMapConsumer.eachMapping(function (mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util$2.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util$2.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };

/**
 * Add a single mapping from original source line and column to the generated
 * source's line and column for this source map being created. The mapping
 * object should have the following properties:
 *
 *   - generated: An object with the generated line and column positions.
 *   - original: An object with the original line and column positions.
 *   - source: The original source file (relative to the sourceRoot).
 *   - name: An optional original token name for this mapping.
 */
SourceMapGenerator$1.prototype.addMapping =
  function SourceMapGenerator_addMapping(aArgs) {
    var generated = util$2.getArg(aArgs, 'generated');
    var original = util$2.getArg(aArgs, 'original', null);
    var source = util$2.getArg(aArgs, 'source', null);
    var name = util$2.getArg(aArgs, 'name', null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source: source,
      name: name
    });
  };

/**
 * Set the source content for a source file.
 */
SourceMapGenerator$1.prototype.setSourceContent =
  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util$2.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util$2.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util$2.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };

/**
 * Applies the mappings of a sub-source-map for a specific source file to the
 * source map being generated. Each mapping to the supplied source file is
 * rewritten using the supplied source map. Note: The resolution for the
 * resulting mappings is the minimium of this map and the supplied map.
 *
 * @param aSourceMapConsumer The source map to be applied.
 * @param aSourceFile Optional. The filename of the source file.
 *        If omitted, SourceMapConsumer's file property will be used.
 * @param aSourceMapPath Optional. The dirname of the path to the source map
 *        to be applied. If relative, it is relative to the SourceMapConsumer.
 *        This parameter is needed when the two source maps aren't in the same
 *        directory, and the source map to be applied contains relative source
 *        paths. If so, those relative source paths need to be rewritten
 *        relative to the SourceMapGenerator.
 */
SourceMapGenerator$1.prototype.applySourceMap =
  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util$2.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    var newSources = new ArraySet$1();
    var newNames = new ArraySet$1();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function (mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util$2.join(aSourceMapPath, mapping.source);
          }
          if (sourceRoot != null) {
            mapping.source = util$2.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          sourceFile = util$2.join(aSourceMapPath, sourceFile);
        }
        if (sourceRoot != null) {
          sourceFile = util$2.relative(sourceRoot, sourceFile);
        }
        this.setSourceContent(sourceFile, content);
      }
    }, this);
  };

/**
 * A mapping can have one of the three levels of data:
 *
 *   1. Just the generated position.
 *   2. The Generated position, original position, and original source.
 *   3. Generated and original position, original source, as well as a name
 *      token.
 *
 * To maintain consistency, we validate that any new mapping being added falls
 * in to one of these categories.
 */
SourceMapGenerator$1.prototype._validateMapping =
  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                              aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
        throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
            'the original mapping entirely and only map the generated position. If so, pass ' +
            'null for the original mapping instead of an object with empty or null values.'
        );
    }

    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) {
      // Case 1.
      return;
    }
    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) {
      // Cases 2 and 3.
      return;
    }
    else {
      throw new Error('Invalid mapping: ' + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };

/**
 * Serialize the accumulated mappings in to the stream of base 64 VLQs
 * specified by the source map format.
 */
SourceMapGenerator$1.prototype._serializeMappings =
  function SourceMapGenerator_serializeMappings() {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = '';
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;

    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = '';

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ';';
          previousGeneratedLine++;
        }
      }
      else {
        if (i > 0) {
          if (!util$2.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ',';
        }
      }

      next += base64VLQ$1.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ$1.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64VLQ$1.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64VLQ$1.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ$1.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  };

SourceMapGenerator$1.prototype._generateSourcesContent =
  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function (source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util$2.relative(aSourceRoot, source);
      }
      var key = util$2.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  };

/**
 * Externalize the source map.
 */
SourceMapGenerator$1.prototype.toJSON =
  function SourceMapGenerator_toJSON() {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  };

/**
 * Render the source map being generated to a string.
 */
SourceMapGenerator$1.prototype.toString =
  function SourceMapGenerator_toString() {
    return JSON.stringify(this.toJSON());
  };

sourceMapGenerator.SourceMapGenerator = SourceMapGenerator$1;

var sourceMapConsumer = {};

var binarySearch$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

(function (exports) {
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	exports.GREATEST_LOWER_BOUND = 1;
	exports.LEAST_UPPER_BOUND = 2;

	/**
	 * Recursive implementation of binary search.
	 *
	 * @param aLow Indices here and lower do not contain the needle.
	 * @param aHigh Indices here and higher do not contain the needle.
	 * @param aNeedle The element being searched for.
	 * @param aHaystack The non-empty array being searched.
	 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
	 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
	 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
	 *     closest element that is smaller than or greater than the one we are
	 *     searching for, respectively, if the exact element cannot be found.
	 */
	function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
	  // This function terminates when one of the following is true:
	  //
	  //   1. We find the exact element we are looking for.
	  //
	  //   2. We did not find the exact element, but we can return the index of
	  //      the next-closest element.
	  //
	  //   3. We did not find the exact element, and there is no next-closest
	  //      element than the one we are searching for, so we return -1.
	  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
	  var cmp = aCompare(aNeedle, aHaystack[mid], true);
	  if (cmp === 0) {
	    // Found the element we are looking for.
	    return mid;
	  }
	  else if (cmp > 0) {
	    // Our needle is greater than aHaystack[mid].
	    if (aHigh - mid > 1) {
	      // The element is in the upper half.
	      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
	    }

	    // The exact needle element was not found in this haystack. Determine if
	    // we are in termination case (3) or (2) and return the appropriate thing.
	    if (aBias == exports.LEAST_UPPER_BOUND) {
	      return aHigh < aHaystack.length ? aHigh : -1;
	    } else {
	      return mid;
	    }
	  }
	  else {
	    // Our needle is less than aHaystack[mid].
	    if (mid - aLow > 1) {
	      // The element is in the lower half.
	      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
	    }

	    // we are in termination case (3) or (2) and return the appropriate thing.
	    if (aBias == exports.LEAST_UPPER_BOUND) {
	      return mid;
	    } else {
	      return aLow < 0 ? -1 : aLow;
	    }
	  }
	}

	/**
	 * This is an implementation of binary search which will always try and return
	 * the index of the closest element if there is no exact hit. This is because
	 * mappings between original and generated line/col pairs are single points,
	 * and there is an implicit region between each of them, so a miss just means
	 * that you aren't on the very start of a region.
	 *
	 * @param aNeedle The element you are looking for.
	 * @param aHaystack The array that is being searched.
	 * @param aCompare A function which takes the needle and an element in the
	 *     array and returns -1, 0, or 1 depending on whether the needle is less
	 *     than, equal to, or greater than the element, respectively.
	 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
	 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
	 *     closest element that is smaller than or greater than the one we are
	 *     searching for, respectively, if the exact element cannot be found.
	 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
	 */
	exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
	  if (aHaystack.length === 0) {
	    return -1;
	  }

	  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
	                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
	  if (index < 0) {
	    return -1;
	  }

	  // We have found either the exact element, or the next-closest element than
	  // the one we are searching for. However, there may be more than one such
	  // element. Make sure we always return the smallest of these.
	  while (index - 1 >= 0) {
	    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
	      break;
	    }
	    --index;
	  }

	  return index;
	};
} (binarySearch$1));

var quickSort$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
quickSort$1.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$1 = util$5;
var binarySearch = binarySearch$1;
var ArraySet = arraySet.ArraySet;
var base64VLQ = base64Vlq;
var quickSort = quickSort$1.quickSort;

function SourceMapConsumer$1(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
    : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
}

SourceMapConsumer$1.fromSourceMap = function(aSourceMap, aSourceMapURL) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
};

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer$1.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer$1.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer$1.prototype, '_generatedMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer$1.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer$1.prototype, '_originalMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer$1.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer$1.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer$1.GENERATED_ORDER = 1;
SourceMapConsumer$1.ORIGINAL_ORDER = 2;

SourceMapConsumer$1.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer$1.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer$1.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer$1.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer$1.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer$1.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      source = util$1.computeSourceURL(sourceRoot, source, this._sourceMapURL);
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number is 1-based.
 *   - column: Optional. the column number in the original source.
 *    The column number is 0-based.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *    line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *    The column number is 0-based.
 */
SourceMapConsumer$1.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util$1.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util$1.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util$1.getArg(aArgs, 'column', 0)
    };

    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util$1.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util$1.getArg(mapping, 'generatedLine', null),
            column: util$1.getArg(mapping, 'generatedColumn', null),
            lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util$1.getArg(mapping, 'generatedLine', null),
            column: util$1.getArg(mapping, 'generatedColumn', null),
            lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

sourceMapConsumer.SourceMapConsumer = SourceMapConsumer$1;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  var version = util$1.getArg(sourceMap, 'version');
  var sources = util$1.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util$1.getArg(sourceMap, 'names', []);
  var sourceRoot = util$1.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util$1.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util$1.getArg(sourceMap, 'mappings');
  var file = util$1.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  if (sourceRoot) {
    sourceRoot = util$1.normalize(sourceRoot);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util$1.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util$1.isAbsolute(sourceRoot) && util$1.isAbsolute(source)
        ? util$1.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);

  this._absoluteSources = this._sources.toArray().map(function (s) {
    return util$1.computeSourceURL(sourceRoot, s, aSourceMapURL);
  });

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this._sourceMapURL = aSourceMapURL;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer$1.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer$1;

/**
 * Utility function to find the index of a source.  Returns -1 if not
 * found.
 */
BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
  var relativeSource = aSource;
  if (this.sourceRoot != null) {
    relativeSource = util$1.relative(this.sourceRoot, relativeSource);
  }

  if (this._sources.has(relativeSource)) {
    return this._sources.indexOf(relativeSource);
  }

  // Maybe aSource is an absolute URL as returned by |sources|.  In
  // this case we can't simply undo the transform.
  var i;
  for (i = 0; i < this._absoluteSources.length; ++i) {
    if (this._absoluteSources[i] == aSource) {
      return i;
    }
  }

  return -1;
};

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @param String aSourceMapURL
 *        The URL at which the source map can be found (optional)
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;
    smc._sourceMapURL = aSourceMapURL;
    smc._absoluteSources = smc._sources.toArray().map(function (s) {
      return util$1.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
    });

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, util$1.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._absoluteSources.slice();
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort(generatedMappings, util$1.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort(originalMappings, util$1.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util$1.getArg(aArgs, 'line'),
      generatedColumn: util$1.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util$1.compareByGeneratedPositionsDeflated,
      util$1.getArg(aArgs, 'bias', SourceMapConsumer$1.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util$1.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          source = util$1.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }
        var name = util$1.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util$1.getArg(mapping, 'originalLine', null),
          column: util$1.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    var index = this._findSourceIndex(aSource);
    if (index >= 0) {
      return this.sourcesContent[index];
    }

    var relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util$1.relative(this.sourceRoot, relativeSource);
    }

    var url;
    if (this.sourceRoot != null
        && (url = util$1.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util$1.getArg(aArgs, 'source');
    source = this._findSourceIndex(source);
    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }

    var needle = {
      source: source,
      originalLine: util$1.getArg(aArgs, 'line'),
      originalColumn: util$1.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util$1.compareByOriginalPositions,
      util$1.getArg(aArgs, 'bias', SourceMapConsumer$1.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util$1.getArg(mapping, 'generatedLine', null),
          column: util$1.getArg(mapping, 'generatedColumn', null),
          lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

sourceMapConsumer.BasicSourceMapConsumer = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  var version = util$1.getArg(sourceMap, 'version');
  var sections = util$1.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util$1.getArg(s, 'offset');
    var offsetLine = util$1.getArg(offset, 'line');
    var offsetColumn = util$1.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer$1(util$1.getArg(s, 'map'), aSourceMapURL)
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer$1.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer$1;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util$1.getArg(aArgs, 'line'),
      generatedColumn: util$1.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based. 
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer._findSourceIndex(util$1.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        source = util$1.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = null;
        if (mapping.name) {
          name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
        }

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, util$1.compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, util$1.compareByOriginalPositions);
  };

sourceMapConsumer.IndexedSourceMapConsumer = IndexedSourceMapConsumer;

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var SourceMapGenerator = sourceMapGenerator.SourceMapGenerator;
var util = util$5;

// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
// operating systems these days (capturing the result).
var REGEX_NEWLINE = /(\r?\n)/;

// Newline character code for charCodeAt() comparisons
var NEWLINE_CODE = 10;

// Private symbol for identifying `SourceNode`s when multiple versions of
// the source-map library are loaded. This MUST NOT CHANGE across
// versions!
var isSourceNode = "$$$isSourceNode$$$";

/**
 * SourceNodes provide a way to abstract over interpolating/concatenating
 * snippets of generated JavaScript source code while maintaining the line and
 * column information associated with the original source code.
 *
 * @param aLine The original line number.
 * @param aColumn The original column number.
 * @param aSource The original source's filename.
 * @param aChunks Optional. An array of strings which are snippets of
 *        generated JS, or other SourceNodes.
 * @param aName The original identifier.
 */
function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
  this.children = [];
  this.sourceContents = {};
  this.line = aLine == null ? null : aLine;
  this.column = aColumn == null ? null : aColumn;
  this.source = aSource == null ? null : aSource;
  this.name = aName == null ? null : aName;
  this[isSourceNode] = true;
  if (aChunks != null) this.add(aChunks);
}

/**
 * Creates a SourceNode from generated code and a SourceMapConsumer.
 *
 * @param aGeneratedCode The generated code
 * @param aSourceMapConsumer The SourceMap for the generated code
 * @param aRelativePath Optional. The path that relative sources in the
 *        SourceMapConsumer should be relative to.
 */
SourceNode.fromStringWithSourceMap =
  function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    // The SourceNode we want to fill with the generated code
    // and the SourceMap
    var node = new SourceNode();

    // All even indices of this array are one line of the generated code,
    // while all odd indices are the newlines between two adjacent lines
    // (since `REGEX_NEWLINE` captures its match).
    // Processed fragments are accessed by calling `shiftNextLine`.
    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    var remainingLinesIndex = 0;
    var shiftNextLine = function() {
      var lineContents = getNextLine();
      // The last line of a file might not have a newline.
      var newLine = getNextLine() || "";
      return lineContents + newLine;

      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ?
            remainingLines[remainingLinesIndex++] : undefined;
      }
    };

    // We need to remember the position of "remainingLines"
    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

    // The generate SourceNodes we need a code range.
    // To extract it current and last mapping is used.
    // Here we store the last mapping.
    var lastMapping = null;

    aSourceMapConsumer.eachMapping(function (mapping) {
      if (lastMapping !== null) {
        // We add the code from "lastMapping" to "mapping":
        // First check if there is a new line in between.
        if (lastGeneratedLine < mapping.generatedLine) {
          // Associate first line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
          // The remaining code is added without mapping
        } else {
          // There is no new line in between.
          // Associate the code between "lastGeneratedColumn" and
          // "mapping.generatedColumn" with "lastMapping"
          var nextLine = remainingLines[remainingLinesIndex] || '';
          var code = nextLine.substr(0, mapping.generatedColumn -
                                        lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                              lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          // No more remaining code, continue
          lastMapping = mapping;
          return;
        }
      }
      // We add the generated code until the first mapping
      // to the SourceNode without any mapping.
      // Each line is added as separate string.
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        var nextLine = remainingLines[remainingLinesIndex] || '';
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    // We have processed all mappings.
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        // Associate the remaining code in the current line with "lastMapping"
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      // and add the remaining lines without any mapping
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }

    // Copy sourcesContent into SourceNode
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });

    return node;

    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === undefined) {
        node.add(code);
      } else {
        var source = aRelativePath
          ? util.join(aRelativePath, mapping.source)
          : mapping.source;
        node.add(new SourceNode(mapping.originalLine,
                                mapping.originalColumn,
                                source,
                                code,
                                mapping.name));
      }
    }
  };

/**
 * Add a chunk of generated JS to this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.add = function SourceNode_add(aChunk) {
  if (Array.isArray(aChunk)) {
    aChunk.forEach(function (chunk) {
      this.add(chunk);
    }, this);
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    if (aChunk) {
      this.children.push(aChunk);
    }
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Add a chunk of generated JS to the beginning of this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
  if (Array.isArray(aChunk)) {
    for (var i = aChunk.length-1; i >= 0; i--) {
      this.prepend(aChunk[i]);
    }
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    this.children.unshift(aChunk);
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Walk over the tree of JS snippets in this node and its children. The
 * walking function is called once for each snippet of JS and is passed that
 * snippet and the its original associated source's line/column location.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walk = function SourceNode_walk(aFn) {
  var chunk;
  for (var i = 0, len = this.children.length; i < len; i++) {
    chunk = this.children[i];
    if (chunk[isSourceNode]) {
      chunk.walk(aFn);
    }
    else {
      if (chunk !== '') {
        aFn(chunk, { source: this.source,
                     line: this.line,
                     column: this.column,
                     name: this.name });
      }
    }
  }
};

/**
 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
 * each of `this.children`.
 *
 * @param aSep The separator.
 */
SourceNode.prototype.join = function SourceNode_join(aSep) {
  var newChildren;
  var i;
  var len = this.children.length;
  if (len > 0) {
    newChildren = [];
    for (i = 0; i < len-1; i++) {
      newChildren.push(this.children[i]);
      newChildren.push(aSep);
    }
    newChildren.push(this.children[i]);
    this.children = newChildren;
  }
  return this;
};

/**
 * Call String.prototype.replace on the very right-most source snippet. Useful
 * for trimming whitespace from the end of a source node, etc.
 *
 * @param aPattern The pattern to replace.
 * @param aReplacement The thing to replace the pattern with.
 */
SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
  var lastChild = this.children[this.children.length - 1];
  if (lastChild[isSourceNode]) {
    lastChild.replaceRight(aPattern, aReplacement);
  }
  else if (typeof lastChild === 'string') {
    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
  }
  else {
    this.children.push(''.replace(aPattern, aReplacement));
  }
  return this;
};

/**
 * Set the source content for a source file. This will be added to the SourceMapGenerator
 * in the sourcesContent field.
 *
 * @param aSourceFile The filename of the source file
 * @param aSourceContent The content of the source file
 */
SourceNode.prototype.setSourceContent =
  function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
  };

/**
 * Walk over the tree of SourceNodes. The walking function is called for each
 * source file content and is passed the filename and source content.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walkSourceContents =
  function SourceNode_walkSourceContents(aFn) {
    for (var i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }

    var sources = Object.keys(this.sourceContents);
    for (var i = 0, len = sources.length; i < len; i++) {
      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    }
  };

/**
 * Return the string representation of this source node. Walks over the tree
 * and concatenates all the various snippets together to one string.
 */
SourceNode.prototype.toString = function SourceNode_toString() {
  var str = "";
  this.walk(function (chunk) {
    str += chunk;
  });
  return str;
};

/**
 * Returns the string representation of this source node along with a source
 * map.
 */
SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
  var generated = {
    code: "",
    line: 1,
    column: 0
  };
  var map = new SourceMapGenerator(aArgs);
  var sourceMappingActive = false;
  var lastOriginalSource = null;
  var lastOriginalLine = null;
  var lastOriginalColumn = null;
  var lastOriginalName = null;
  this.walk(function (chunk, original) {
    generated.code += chunk;
    if (original.source !== null
        && original.line !== null
        && original.column !== null) {
      if(lastOriginalSource !== original.source
         || lastOriginalLine !== original.line
         || lastOriginalColumn !== original.column
         || lastOriginalName !== original.name) {
        map.addMapping({
          source: original.source,
          original: {
            line: original.line,
            column: original.column
          },
          generated: {
            line: generated.line,
            column: generated.column
          },
          name: original.name
        });
      }
      lastOriginalSource = original.source;
      lastOriginalLine = original.line;
      lastOriginalColumn = original.column;
      lastOriginalName = original.name;
      sourceMappingActive = true;
    } else if (sourceMappingActive) {
      map.addMapping({
        generated: {
          line: generated.line,
          column: generated.column
        }
      });
      lastOriginalSource = null;
      sourceMappingActive = false;
    }
    for (var idx = 0, length = chunk.length; idx < length; idx++) {
      if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
        generated.line++;
        generated.column = 0;
        // Mappings end at eol
        if (idx + 1 === length) {
          lastOriginalSource = null;
          sourceMappingActive = false;
        } else if (sourceMappingActive) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
      } else {
        generated.column++;
      }
    }
  });
  this.walkSourceContents(function (sourceFile, sourceContent) {
    map.setSourceContent(sourceFile, sourceContent);
  });

  return { code: generated.code, map: map };
};

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
var SourceMapConsumer = sourceMapConsumer.SourceMapConsumer;

/**
 * 校正异常的堆栈信息
 * 
 * 由于 rollup 会打包所有代码到一个文件，所以异常的调用栈定位和源码的位置是不同的
 * 本模块就是用来将异常的调用栈映射至源代码位置
 * 
 * @see https://github.com/screepers/screeps-typescript-starter/blob/master/src/utils/ErrorMapper.ts
 */

// 缓存 SourceMap
let consumer = null;

// 第一次报错时创建 sourceMap
const getConsumer = function () {
    if (consumer == null) consumer = new SourceMapConsumer(require("main.js.map"));
    return consumer
};

// 缓存映射关系以提高性能
const cache = {};

/**
 * 使用源映射生成堆栈跟踪，并生成原始标志位
 * 警告 - global 重置之后的首次调用会产生很高的 cpu 消耗 (> 30 CPU)
 * 之后的每次调用会产生较低的 cpu 消耗 (~ 0.1 CPU / 次)
 *
 * @param {Error | string} error 错误或原始追踪栈
 * @returns {string} 映射之后的源代码追踪栈
 */
const sourceMappedStackTrace = function (error) {
    const stack = error instanceof Error ? error.stack : error;
    // 有缓存直接用
    if (cache.hasOwnProperty(stack)) return cache[stack]

    const re = /^\s+at\s+(.+?\s+)?\(?([0-z._\-\\\/]+):(\d+):(\d+)\)?$/gm;
    let match;
    let outStack = error.toString();
    console.log("ErrorMapper -> sourceMappedStackTrace -> outStack", outStack);

    while ((match = re.exec(stack))) {
        // 解析完成
        if (match[2] !== "main") break

        // 获取追踪定位
        const pos = getConsumer().originalPositionFor({
            column: parseInt(match[4], 10),
            line: parseInt(match[3], 10)
        });

        // 无法定位
        if (!pos.line) break

        // 解析追踪栈
        if (pos.name) outStack += `\n    at ${pos.name} (${pos.source}:${pos.line}:${pos.column})`;
        else {
            // 源文件没找到对应文件名，采用原始追踪名
            if (match[1]) outStack += `\n    at ${match[1]} (${pos.source}:${pos.line}:${pos.column})`;
            // 源文件没找到对应文件名并且原始追踪栈里也没有，直接省略
            else outStack += `\n    at ${pos.source}:${pos.line}:${pos.column}`;
        }
    }

    cache[stack] = outStack;
    return outStack
};

/**
 * 错误追踪包装器
 * 用于把报错信息通过 source-map 解析成源代码的错误位置
 * 和原本 wrapLoop 的区别是，wrapLoop 会返回一个新函数，而这个会直接执行
 * 
 * @param next 玩家代码
 */
const errorMapper = function (next) {
    return () => {
        try {
            // 执行玩家代码
            next();
        }
        catch (e) {
            if (e instanceof Error) {
                // 渲染报错调用栈，沙盒模式用不了这个
                const errorMessage = Game.rooms.sim ?
                    `沙盒模式无法使用 source-map - 显示原始追踪栈<br>${_.escape(e.stack)}` :
                    `${_.escape(sourceMappedStackTrace(e))}`;

                console.log(`<text style="color:#ef9a9a">${errorMessage}</text>`);
            }
            // 处理不了，直接抛出
            else throw e
        }
    }
};

/**
 * 通用方法或属性
 * setDebug:弄一个Flag设置为class名 那这个CLASS的这个房间就会是debugroom
 * iscanref:间隔计算
 * _getPosCanMove:这个点是否能移动
 * moveMapNotOut:走到边界防卡 这个按说应该放移动模块去
 * */
class Basic78 {
    constructor() {
        //输入
        //debug
        this.logleaveAuto = 40;
        this.logleave = 10; //调度时log等级 
        this.debuglogkey = "";
        //这4个好象没用了
        this.debugrolekey = "";
        this.debugsourceid = "";
        this.debugtargetid = "";
        this.debugcreepname = "";
        //每个任务可以设置不同 比如A任务每10TICK算一个ROOM 然后LV为20
        this.reftotal = 10; //如果 tick%reftotal==refcount就计算
        //降级设置 例如战争中 设置20 refleave<20的就不计算了
        this.refleave = 10; //如果 refleave<refleaveTotal不计算
        this.refleaveTotal = 10; //默认10 提高就可以降级
        this.reftotal = 10;
        this.logleaveAuto = 40;
    }
    addlog(key1, info, leave = 1, obj = null, key2 = "", key3 = "", key4 = "", key5 = "", key6 = "") {
        //console.log(JSON.stringify( global.mine9["log"]["061f6eff-23d1-7cea-83ae-ba6f364cb249"]))
        //console.log(JSON.stringify( global.mine9["log"]["64ec65e930b33668a1016e84"]))
        let self = this;
        info = "~~" + global.tick + this.classname + "--" + key1 + "--" + info;
        let isdebug = false;
        if (Game.creeps["debug"]) {
            this.debuglogkey = Game.creeps["debug"].memory["debuglogkey"];
        }
        if (this.debuglogkey) {
            if (key1 && this.debuglogkey.indexOf("~" + key1 + "~") >= 0)
                isdebug = true;
            if (key2 && this.debuglogkey.indexOf("~" + key2 + "~") >= 0)
                isdebug = true;
            if (key3 && this.debuglogkey.indexOf("~" + key3 + "~") >= 0)
                isdebug = true;
            if (key4 && this.debuglogkey.indexOf("~" + key4 + "~") >= 0)
                isdebug = true;
            if (key5 && this.debuglogkey.indexOf("~" + key5 + "~") >= 0)
                isdebug = true;
            if (key6 && this.debuglogkey.indexOf("~" + key6 + "~") >= 0)
                isdebug = true;
            if (this.classname && this.debuglogkey.indexOf("~" + this.classname + "~") >= 0)
                isdebug = true;
        }
        if (isdebug || leave >= self.logleave) {
            if (obj) {
                if (typeof obj == "object")
                    obj = JSON.stringify(obj);
                info = info + obj;
            }
            console.log(info);
        }
        if (!global.mine9["log"])
            global.mine9["log"] = {};
        if (!global.mine9["log"][key1])
            global.mine9["log"][key1] = [];
        if (key2 && !global.mine9["log"][key2])
            global.mine9["log"][key2] = [];
        if (key3 && !global.mine9["log"][key3])
            global.mine9["log"][key3] = [];
        if (key4 && !global.mine9["log"][key4])
            global.mine9["log"][key4] = [];
        if (key5 && !global.mine9["log"][key5])
            global.mine9["log"][key5] = [];
        if (key6 && !global.mine9["log"][key6])
            global.mine9["log"][key6] = [];
        if (this.classname && !global.mine9["log"][this.classname])
            global.mine9["log"][this.classname] = [];
        global.mine9["log"][key1].push(info);
        if (key2)
            global.mine9["log"][key2].push(info);
        if (key3)
            global.mine9["log"][key3].push(info);
        if (key4)
            global.mine9["log"][key4].push(info);
        if (key5)
            global.mine9["log"][key5].push(info);
        if (key6)
            global.mine9["log"][key6].push(info);
        if (this.classname)
            global.mine9["log"][this.classname].push(info);
    }
    getObjectById(id) {
        let backobj = null;
        try {
            backobj = Game.getObjectById(id);
        }
        catch (e) {
            this.AddLog(this.classname + "catch getObjectById  :" + id, 50);
        }
        return backobj;
    }
    /**
     * 必须调这个
     * this.globalclass 不用内存
     * this.memoryclass 内存中
     * */
    init() {
        this.logleave = this.logleaveAuto;
        if (this.globalclass)
            return;
        this.AddLog("init test: " + this.classname, 10);
        if (!global.mine9[this.classname])
            global.mine9[this.classname] = {};
        this.globalclass = global.mine9[this.classname];
        if (this.classname == "roomdata" || !this.classname || this.classname == "RoleCenter") {
            if (!Memory["rolelist78"])
                Memory["rolelist78"] = {};
            delete Memory["rolelist78"][this.classname];
            return;
        }
        if (!Memory["rolelist78"])
            Memory["rolelist78"] = {};
        if (!Memory["rolelist78"][this.classname])
            Memory["rolelist78"][this.classname] = {};
        this.memoryclass = Memory["rolelist78"][this.classname];
    }
    getGlobalclass() {
        return global.mine9[this.classname];
    }
    getMemoryclass() {
        return Memory["rolelist78"][this.classname];
    }
    /**
    * 刷新爬的位置local
    * @param creep
    */
    reflocal(creep) {
        let roomname = creep.room.name;
        //if (this.debugrolekey && creep.memory["rolekey"] == this.debugrolekey)
        //    creep.memory["isdebug"] = 1;
        //if (this.debugsourceid && creep.memory["sourceid"] == this.debugsourceid)
        //    creep.memory["isdebug"] = 1;
        //if (this.debugtargetid && creep.memory["targetid"] == this.debugtargetid)
        //    creep.memory["isdebug"] = 1;
        //if (this.debugcreepname && creep.name == this.debugcreepname)
        //    creep.memory["isdebug"] = 1;
        let localroom = creep.memory["local"];
        let ckind = creep.memory["ckind"];
        if (!global.mine9[roomname])
            global.mine9[roomname] = {};
        if (!global.mine9[roomname]["local"])
            global.mine9[roomname]["local"] = {};
        if (!global.mine9[roomname]["local"][ckind])
            global.mine9[roomname]["local"][ckind] = {};
        global.mine9[roomname]["local"][ckind][creep.name] = {
            creepname: creep.name, id: creep.id
        };
        if (localroom != roomname) {
            if (localroom && global.mine9[localroom]["local"] && global.mine9[localroom]["local"][ckind]) {
                delete global.mine9[localroom]["local"][ckind][creep.name];
            }
            creep.memory["local"] = roomname;
        }
    }
    /**
     * 是否允许重新计算 为了同一种任务 不同的房间可以分开计算 然后如果CPU紧张可以不算
     * 常用item=roomname 这样refcount=9 refcount+roomname=1 2 3等
     * */
    iscanref(item) {
        //this.AddLog("iscanref :" + item + " " + global.tick, 10)   
        // let roomname = room78.roomname
        let refcount = this.globalclass["refcount" + item];
        //如果为空 肯定tick==1 必须计算
        //refcount >= this.reftotal 应该不会到这里 只是防异常
        if (global.tick == 1 || refcount >= this.reftotal
            || global.tick % this.reftotal == refcount) {
            this.AddLog("iscanref ref ok: " + item + " " + refcount
                + " " + this.reftotal, 10);
            if (global.tick == 1 || refcount >= this.reftotal || refcount == undefined) {
                let refBaseRoom = this.globalclass["refcount"];
                if (refBaseRoom == undefined)
                    refBaseRoom = this.reftotal - 1;
                this.globalclass["refcount" + item] = refBaseRoom;
                refBaseRoom -= 1;
                if (refBaseRoom <= -1)
                    refBaseRoom = this.reftotal - 1;
                this.globalclass["refcount"] = refBaseRoom;
                // this.AddLog("refnum ref ok init :" + globalroom.refnum + " " + global.mine["ref" + kind], 10)   
            }
            return true;
        }
        return false;
    }
    /**
    * 获取这个点能否移动
    * @param nextdes
    * @param isCreepin//true creep也不行
    */
    _getPosCanMove(nextdes, isCreepin = true) {
        if (!nextdes)
            return false;
        const found = nextdes.look();
        let canmove = true;
        for (let m = 0; m < found.length; m++) {
            let type = found[m]["type"];
            this.AddLog("_getPosCanMove found 333 :" + m + type, 0, found[m]);
            if (!canmove)
                break;
            switch (type) {
                case "terrain":
                    if (found[m]["terrain"] == "wall")
                        canmove = false;
                    break;
                case "structure":
                    this.AddLog("do_move  structureType found  :" + found[m]["structure"]["structureType"], 0, found[m]);
                    let structureType = found[m]["structure"]["structureType"];
                    switch (structureType) {
                        case "rampart":
                            break;
                        case "road":
                            //canmove = true;
                            break;
                        case "container":
                            //canmove = true;
                            break;
                        default:
                            canmove = false;
                            break;
                    }
                    break;
                case "constructionSite":
                    this.AddLog("do_move  constructionSite found  :" + found[m]["constructionSite"]["structureType"], 10);
                    if (found[m]["constructionSite"]["structureType"] == "road") ;
                    else
                        canmove = false;
                    break;
                case "creep":
                    if (isCreepin)
                        canmove = false;
                    break;
            }
        }
        this.AddLog("_getPosCanMove found  :"
            + canmove + nextdes.x + " " + nextdes.y + " ", 0);
        return canmove;
    }
    AddLog(info, leave = 1, obj = null) {
        let self = this;
        info = this.classname + "--" + info;
        if (leave >= self.logleave) {
            if (obj) {
                if (typeof obj == "object")
                    obj = JSON.stringify(obj);
                info = info + obj;
            }
            console.log(info);
        }
    }
    getNewid() {
        function s4() {
            try {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16).substring(1);
            }
            catch (e) {
                console.log("getNewid err  why???");
            }
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }
    /**
    * 走到边界防卡  固定移动也需要
    * @param creep
    */
    moveMapNotOut(creep) {
        if (creep.pos.x == 0) {
            let tmp;
            for (var i = -1; i < 1; i++) {
                let nextdes = new RoomPosition(creep.pos.x + 1, creep.pos.y + i, creep.room.name);
                if (!this._getPosCanMove(nextdes))
                    continue;
                switch (i) {
                    case -1:
                        tmp = creep.move(TOP_RIGHT);
                        this.AddLog("_outmaparea TOP_RIGHT:" + tmp, 20);
                        return true;
                    case 0:
                        tmp = creep.move(RIGHT);
                        this.AddLog("_outmaparea LEFT:" + tmp, 20);
                        return true;
                }
            }
            tmp = creep.move(BOTTOM_RIGHT);
            return true;
        }
        if (creep.pos.x == 49) {
            //旁边可能不可移动
            for (var i = -1; i < 1; i++) {
                let nextdes = new RoomPosition(creep.pos.x - 1, creep.pos.y + i, creep.room.name);
                if (!this._getPosCanMove(nextdes))
                    continue;
                switch (i) {
                    case -1:
                        creep.move(TOP_LEFT);
                        return true;
                    case 0:
                        creep.move(LEFT);
                        return true;
                }
            }
            creep.move(BOTTOM_LEFT);
            return true;
        }
        if (creep.pos.y == 0) {
            for (var i = -1; i < 1; i++) {
                let nextdes = new RoomPosition(creep.pos.x + i, creep.pos.y + 1, creep.room.name);
                this.AddLog("moveMapNotOut :" + this.logleave + i, 10, nextdes);
                if (!this._getPosCanMove(nextdes))
                    continue;
                this.AddLog("moveMapNotOut  do it:" + this.logleave + i, 10, nextdes);
                switch (i) {
                    case -1:
                        creep.move(BOTTOM_LEFT);
                        return true;
                    case 0:
                        creep.move(BOTTOM);
                        return true;
                }
            }
            creep.move(BOTTOM_RIGHT);
            return true;
            //creep.move(BOTTOM)
            //return true
        }
        if (creep.pos.y == 49) {
            //旁边可能不可移动
            for (var i = -1; i < 1; i++) {
                let nextdes = new RoomPosition(creep.pos.x + i, creep.pos.y - 1, creep.room.name);
                if (!this._getPosCanMove(nextdes))
                    continue;
                switch (i) {
                    case -1:
                        creep.move(TOP_LEFT);
                        return true;
                    case 0:
                        creep.move(TOP);
                        return true;
                }
            }
            creep.move(TOP_RIGHT);
            return true;
        }
        return false;
    }
    getNextRooms(roomname) {
        return this.defaultset["roomnext"][roomname] || [];
    }
}
Basic78.prototype.debuglogkey = "";
//Basic78.prototype.debugsourceid = ""
//Basic78.prototype.debugtargetid = ""
Basic78.prototype.refleaveTotal = 10;
Basic78.prototype.logleave = 40;
Basic78.prototype.myownname = "www778878net";
Basic78.prototype.defaultset = {
    roomnext: {
        "W5S48": ["W6S48", "W4S48"],
        "W4S48": ["W5S48", "W4S47", "W4S49", "W3S48"],
        "W4S47": ["W4S48"],
        "W4S49": ["W4S48"],
        "W3S48": ["W4S48"],
        "W6S48": ["W5S48"],
        "W6S47": ["W6S48", "W7S47"],
        "W7S47": ["W6S47"],
        "W7S46": ["W7S47"],
        "W7S48": ["W7S47"],
        "W8S47": ["W7S47", "W9S47"],
        "W9S47": ["W8S47"]
    }
};

/**
 *
 * 单房间数据 基础模块
 * */
class RoomData extends Basic78 {
    //----------------------------
    constructor(props) {
        super();
        //必须前置
        if (props) {
            this.classname = props.roomname;
        }
        super.init();
        //this.globalclass = global.mine9[this.classname]//任务挂 
        this._init();
        this.linkstorageid = this.globalclass["linkstorageid"];
        this.linkupid = this.globalclass["linkupid"];
        this.storeoceid = this.globalclass["storeoceid"];
        this.storeupid = this.globalclass["storeupid"];
        this.sources = this.globalclass["sources"];
        this.spawnname = this.globalclass["spawnname"];
        delete Memory["rolelist78"][this.classname];
    }
    getstorage() {
        let room = Game.rooms[this.classname];
        let storage;
        if (room && room.storage) {
            storage = room.storage;
        }
        else {
            //那就肯定有运输到的地方 看附近的哪个库资源少
            let nexts = this.getNextRooms(this.classname);
            let energy = 9999999999;
            if (nexts) {
                for (var i = 0; i < nexts.length; i++) {
                    let nextname = nexts[i];
                    room = Game.rooms[nextname];
                    if (room && room.storage) {
                        let newenergy = room.storage.store.energy;
                        if (!newenergy)
                            newenergy = 0;
                        if (newenergy < energy) {
                            storage = room.storage;
                            energy = newenergy;
                        }
                    }
                }
            }
            if (!storage) {
                if (nexts) {
                    for (var i = 0; i < nexts.length; i++) {
                        let nextname = nexts[i];
                        let nextsnexts = this.getNextRooms(nextname);
                        for (var i = 0; i < nextsnexts.length; i++) {
                            let nextname = nextsnexts[i];
                            room = Game.rooms[nextname];
                            if (room && room.storage) {
                                let newenergy = room.storage.store.energy;
                                if (!newenergy)
                                    newenergy = 0;
                                if (newenergy < energy) {
                                    storage = room.storage;
                                    energy = newenergy;
                                }
                            }
                        }
                    }
                }
            }
        }
        return storage;
    }
    /**
     * 获取某种资源的储量 罐子和交易所
     * @param resourceType
     */
    getStoreResourceType(resourceType) {
        let numtmp = 0;
        if (this.room && this.room.storage && this.room.storage.store[resourceType])
            numtmp = this.room.storage.store[resourceType];
        let numtmp2 = 0;
        if (this.room && this.room.terminal && this.room.terminal.store[resourceType])
            numtmp2 = this.room.terminal.store[resourceType];
        return numtmp + numtmp2;
    }
    /**
     * 获取建筑
     * @param stype
     */
    getstructByType(stype) {
        return this.globalclass[stype];
    }
    /**
     * 获取这个房间的某类爬
     * */
    getlocalcreeps(ckind) {
        if (!this.globalclass["local"])
            this.globalclass["local"] = {};
        return this.globalclass["local"][ckind];
    }
    /**
     * 获取房间数据 到这里说明是要查一遍了
     *
     */
    _init() {
        this.room = Game.rooms[this.classname];
        if (!this.room) {
            global.mine9[this.classname] = {};
            return;
        }
        //if (ref || this.iscanref(this.classname)) {
        this.globalclass["sources"] = this.room.find(FIND_SOURCES); //资源
        //this.globalclass.containers = this.room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_CONTAINER } })
        this.globalclass.extractor = this.room.find(FIND_MINERALS); //特殊资源
        this.globalclass.constructionsites = this.room.find(FIND_CONSTRUCTION_SITES); //工地
        this.globalclass.structures = this.room.find(FIND_STRUCTURES); //建筑
        this.globalclass.creepsother = this.room.find(FIND_HOSTILE_CREEPS); //其它爬
        for (var i = 0; i < this.globalclass.structures.length; i++) {
            let struct = this.globalclass.structures[i];
            let stype = struct.structureType;
            if (stype == "spawn")
                this.globalclass.spawnname = struct["name"];
            let id = struct.id;
            if (!this.globalclass[stype])
                this.globalclass[stype] = {};
            this.globalclass[stype][id] = struct;
        }
        //计算仓库的作用
        this.globalclass["storeoceid"] = [];
        this.globalclass["storeupid"] = "";
        for (let ckey in this.globalclass[STRUCTURE_CONTAINER]) {
            let id = ckey;
            let contai = this.getObjectById(id); // structs[ckey]
            let room = this.room;
            if (room) {
                let contral = room.controller;
                if (contral.pos.inRangeTo(contai, 3)) {
                    this.globalclass["storeupid"] = id;
                    continue;
                }
                for (let sourceindex in this.globalclass["sources"]) {
                    let source = this.globalclass["sources"][sourceindex]; // structs[ckey]
                    if (source.pos.isNearTo(contai)) {
                        this.globalclass["storeoceid"].push(id);
                        break;
                    }
                }
                //if (room.storage && room.storage.pos.inRangeTo(contai, 3)) {
                //this.globalclass["storeoceid"].push(id);
                // continue;
                // }
            }
        }
        //计算link的作用
        let structs = this.globalclass[STRUCTURE_LINK];
        for (let ckey in structs) {
            let id = ckey;
            let contai = this.getObjectById(id); // structs[ckey]
            let room = this.room;
            if (room) {
                let contral = room.controller;
                if (contral.pos.inRangeTo(contai, 3)) {
                    this.globalclass["linkupid"] = id;
                    continue;
                }
                if (room.storage && room.storage.pos.inRangeTo(contai, 3)) {
                    this.globalclass["linkstorageid"] = id;
                    continue;
                }
            }
        }
        //  }
    }
}

/**
 *
 * 所有房间数据 基础模块 输出：就是缓存这个房间的数据
 * */
class RoomData78 extends Basic78 {
    //----------------------------
    constructor(props) {
        super();
        this.classname = "roomdata";
        super.init();
        this._init();
        //this.globalclass = global.mine9[this.classname]//任务挂 
        this.logleaveAuto = 40;
        delete Memory["rolelist78"][this.classname];
    }
    run() {
        //10回合刷一下CREEP
        this._runcreep();
    }
    _runcreep() {
        if (!this.iscanref(this.classname))
            return;
        this.creeps = this.globalclass["creeps"];
        //必须全部删掉重新整 只删一遍
        let refinit = {};
        //按类别来规整
        for (let creepname in Game.creeps) {
            let creep = Game.creeps[creepname];
            let rolekind = creep.memory["rolekind"];
            let ckind = creep.memory["ckind"];
            let roomname = creep.memory["local"];
            if (!global.mine9[roomname])
                global.mine9[roomname] = {};
            if (!refinit[roomname]) {
                delete global.mine9[roomname]["local"];
                refinit[roomname] = true;
            }
            if (!global.mine9[roomname]["local"])
                global.mine9[roomname]["local"] = {};
            if (!global.mine9[roomname]["local"][ckind])
                global.mine9[roomname]["local"][ckind] = {};
            global.mine9[roomname]["local"][ckind][creep.name] = {
                creepname: creep.name, id: creep.id
            };
            if (!refinit[rolekind]) {
                this.creeps[rolekind] = {};
                refinit[rolekind] = true;
            }
            if (!refinit[ckind]) {
                this.creeps[ckind] = {};
                refinit[ckind] = true;
            }
            if (!this.creeps[rolekind])
                this.creeps[rolekind] = {};
            if (!this.creeps[ckind])
                this.creeps[ckind] = {};
            this.creeps[rolekind][creepname] = { name: creepname, id: creep.id };
            this.creeps[ckind][creepname] = { name: creepname, id: creep.id };
        }
        //清理死掉的机器人
        //这里可以发墓碑请求
        for (var tmp in Memory.creeps) {
            if (!Game.creeps[tmp])
                delete Memory.creeps[tmp];
        }
    }
    /**
     * 获取房间数据
     * @param roomname
     */
    getRoomdata(roomname) {
        if (!roomname)
            return null;
        //分TICK查询不同房间的数据
        if (!Game.rooms[roomname]) {
            new RoomData({ roomname: roomname });
            this.AddLog("test getRoomdata:" + roomname, 20);
            return null;
        }
        this.AddLog("getRoomdata:" + (!this.globalclass[roomname]) + this.iscanref(roomname), 28);
        if (!this.globalclass[roomname] || this.iscanref(roomname)) {
            if (this.globalclass[roomname]
                && this.globalclass[roomname]["reftick"] == global.tick)
                return this.globalclass[roomname];
            let roomdata = new RoomData({ roomname: roomname });
            if (roomdata.room) {
                this.globalclass[roomname] = roomdata;
                this.globalclass[roomname]["reftick"] = global.tick;
            }
        }
        return this.globalclass[roomname];
    }
    _init() {
        if (this.creeps)
            return;
        if (!this.globalclass["creeps"])
            this.globalclass["creeps"] = {};
        this.creeps = this.globalclass["creeps"];
    }
}

/**
 * 运输模块 这里不放功能 把功能分解方便调试
 * 分解为:添加 分配 替换 生产
 *
 * */
class Ship78 extends Basic78 {
    //------------------以下自动管理
    //creeps: any //不知道什么原因 init里面初始化会丢 但是用还是要这样用
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Ship78";
        //this.logleaveAuto = 0;  
        this.logleaveAuto = 28; //27 30;  
        super.init();
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
            this.spawn78 = props.spawn78;
            this.shipstore = this.spawn78.shipstore;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
        }
        this._init();
        this.reftotal = 10;
    }
    run() {
        this._run();
    }
    _run() {
        for (let roomname in Game.rooms) {
            let roomdata = this.roomdatas.getRoomdata(roomname);
            this.AddLog("_run   " + this.logleave + " " + roomname, 26, roomdata);
            if (!roomdata)
                continue;
            //this.logleave = this.logleaveAuto
            if (this.iscanref(roomname)) {
                this._addplanAuto(roomdata); //比如外矿这些没法事件的 隔一阵检查下
            }
            //清理
            //try {
            //this._doplan(room78)
            //} catch (e) {
            //    this.AddLog("_doplan err try :" + roomname, 90, e)
            //}
        }
    }
    _addplanAuto(roomdata) {
        //前面判断了roomname必然存在
        //补spawn 
        let roomname = roomdata.room.name;
        if (!this.memoryclass[roomname])
            this.memoryclass[roomname] = {};
        //清理
        for (let rolename in this.memoryclass[roomname]["t"]) {
            let role = this.memoryclass[roomname]["t"][rolename];
            let roletargetid = role["roletargetid"];
            let target = this.getObjectById(roletargetid);
            if (!target)
                delete this.memoryclass[roomname]["t"][rolename];
        }
        for (let rolename in this.memoryclass[roomname]["s"]) {
            let role = this.memoryclass[roomname]["s"][rolename];
            let roletargetid = role["roletargetid"];
            let target = this.getObjectById(roletargetid);
            if (!target)
                delete this.memoryclass[roomname]["s"][rolename];
            //if (roomname == "W35N12") {
            //    this.addlog("_addplanAuto", "clear check s:" + roletargetid
            //        , 10, target ,   roomname)
            //}
        }
        if (roomdata.room
            && roomdata.room.energyAvailable > 0
            && roomdata.room.energyAvailable < roomdata.room.energyCapacityAvailable) {
            this.AddLog("autoplan  spawn:" + roomname, 10, roomdata);
            //spawn可能多个
            this.addplan(Game.spawns[roomdata.spawnname].id, "t", "spawn", roomdata.room.energyCapacityAvailable - roomdata.room.energyAvailable, "energy", 0, 0, "", roomname);
        }
        //仓库这里应该要识别 不要把UP弄进来 或者UP那里去除也行
        let structs; // 
        //仓库不用了 直接用预警的
        //structs = roomdata.getstructByType(STRUCTURE_CONTAINER)
        //for (let index in structs) {
        //    let struct = structs[index]
        //    let id = struct.id;
        //    this.AddLog("_addplan check  full:" + roomname
        //        + " " + struct["store"].getFreeCapacity(), 10, struct.pos)
        //    if (this.memoryclass[roomname]["t"]["id"]) continue;
        //    if (struct["store"].getUsedCapacity() >= 500) {
        //        this.ship78.addplan(id, "s", "sourcenormal", struct["store"].getUsedCapacity(), "energy")
        //    }
        //}
        structs = roomdata.getstructByType(STRUCTURE_TOWER);
        this.AddLog("autoplan  tower:", 10, structs);
        for (let ckey in structs) {
            let stuid = ckey;
            let tower = this.getObjectById(stuid); // structs[ckey]
            //let tower: StructureTower = structs[ckey]
            if (tower && tower.store.getFreeCapacity(RESOURCE_ENERGY) == 0)
                continue;
            //this.AddLog("autoplan  tower add power:", 40, structs);
            this.addplan(stuid, "t", "tower", tower.store.getFreeCapacity(RESOURCE_ENERGY), "energy");
        }
        if (roomdata.linkstorageid) {
            let tmpstr = roomdata.linkstorageid;
            let lickst = this.getObjectById(tmpstr);
            this.AddLog("_addplan check  linkstorage:" + roomname
                + " " + lickst.store.getFreeCapacity(RESOURCE_ENERGY), 10);
            if (lickst.store.getFreeCapacity(RESOURCE_ENERGY) > 100)
                this.addplan(roomdata.linkstorageid, "t", "linkstorage", 800, "energy");
        }
        //捡扔的资源 还有其它几种资源也要加上 要测试
        if (roomdata && roomdata.room) {
            structs = roomdata.room.find(FIND_DROPPED_RESOURCES);
            for (var i = 0; i < structs.length; i++) {
                let structtmp = structs[i];
                this.AddLog("pickup    FIND_DROPPED_RESOURCES:" + this.logleave, 0, structtmp);
                //"energy":486,"amount":486,"resourceType":"energy"
                let energy = structtmp["energy"];
                if (energy <= 40)
                    continue;
                //后面改成没有罐子才continue
                let resourceType = structtmp["resourceType"];
                if (resourceType != "energy") {
                    delete this.getMemoryclass()[roomname]["s"][structtmp.id + this.classname];
                    continue; //&& !roomdata.room.storage
                }
                let id = structtmp.id;
                this.addplan(id, "s", "resoucebig", energy, "energy");
                this.AddLog("pickup find  check in roomrole:" + this.logleave, 0, structtmp);
            }
            structs = roomdata.room.find(FIND_RUINS);
            for (var i = 0; i < structs.length; i++) {
                let structtmp = structs[i];
                this.AddLog("pickup find :" + this.logleave, 0, structtmp);
                //"energy":486,"amount":486,"resourceType":"energy"
                let energy = structtmp["store"]["energy"];
                if (energy <= 40)
                    continue;
                let id = structtmp.id;
                this.addplan(id, "s", "resoucebig", energy, "energy");
                this.AddLog("pickup find  check roomrole:" + this.logleave, 20, structtmp);
            }
        }
    }
    _init() {
        for (let roomname in Game.rooms) {
            if (!this.memoryclass[roomname])
                this.memoryclass[roomname] = {};
            if (!this.memoryclass[roomname]["s"])
                this.memoryclass[roomname]["s"] = {};
            if (!this.memoryclass[roomname]["t"])
                this.memoryclass[roomname]["t"] = {};
            this.AddLog("init:" + roomname, 0, this.memoryclass[roomname]);
        }
    }
    /**
     * .莫名其妙就清了
     * .clear时打一下理由和日志 把mem打出来
     * .得把pos存进mem先
     * */
    CreepRun(creep) {
        this.reflocal(creep);
        //如果我的仓库容量小于房间的一半自杀     
        if (creep.store.getCapacity() < creep.room.energyAvailable / 3) {
            let creeps = this.roomdatas.creeps[this.classname];
            if (Object.keys(creeps).length > Object.keys(Game.rooms).length) {
                this.AddLog("Creep suicide   test :" + creep.room.name, 20, creep.pos);
                delete this.roomdatas.creeps[this.classname][creep.name];
                creep.suicide();
                return;
            }
        }
        let ckind = creep.memory["ckind"];
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        let targetid = creep.memory["targetid"];
        let sourceid = creep.memory["sourceid"];
        creep.memory["rolekind"];
        let rolekey = creep.memory["rolekey"];
        let roomname = creep.memory["roleroom"];
        let srolekey = creep.memory["srolekey"];
        let trolekey = creep.memory["trolekey"];
        this.addlog("shipcreep", "Creep run   testin :" + creep.name + ckind, 10, creep.memory, creep.name, targetid, sourceid, srolekey, trolekey);
        this.addlog("shipcreep", "Creep run   testinpos :" + creep.name, 10, creep.pos, creep.name, targetid, sourceid, srolekey, trolekey);
        if (creep.spawning)
            return;
        let enkindt = creep.memory["enkindt"];
        creep.memory["enkinds"];
        //if (this.logleave == 10)
        //this.AddLog("Creep   test in debug:" + this.logleave, 10, creep.pos);
        //if (enkindt == "spawn")
        //    this.logleave = 10
        //else
        //    this.logleave = this.logleaveAuto
        //默认罐子
        let roomdata = this.roomdatas.getRoomdata(creep.room.name);
        let storage = roomdata.getstorage();
        //没任务了还能源
        if (!rolekey) {
            //还能源
            if (creep.store.getUsedCapacity() > 0) {
                //直接找到罐子
                this.addlog("shipcreep", " backpower", 20, creep, creep.name, rolekey, targetid, sourceid);
                creep.memory["rolekey"] = "backpower";
                creep.memory["lv"] = -1;
                creep.memory["lvt"] = -1;
                creep.memory["lvs"] = -1;
                creep.memory["enkindt"] = "";
                creep.memory["rolestep"] = "target";
                this.AddLog("Creep   backpower find storage:"
                    + this.logleave + rolekey + " " + creep.id, 10, storage);
                if (storage) {
                    this.creepClearMemory(creep);
                    creep.memory["sourceid"] = storage.id;
                    creep.memory["targetid"] = storage.id;
                }
                else {
                    //没有随便找个空仓库
                    this.__creeprunGetTargetid(creep);
                }
                return;
            }
            this.addlog("shipcreep", " rolekey empty", 20, creep, creep.name, rolekey, targetid, sourceid);
            this.creepClearMemory(creep);
            this.AddLog("Creep creeprun2 rolekey empty:" + this.logleave + rolekey + " " + creep.id, 10, creep.pos);
            return;
        }
        delete creep.memory["isnotrold"];
        let rolestep = creep.memory["rolestep"];
        if (rolekey == "backpower") {
            if (creep.store.getUsedCapacity() == 0) {
                delete creep.memory["rolekey"];
                rolekey = "";
                return;
            }
            else {
                rolestep = "target";
            }
        }
        creep.memory["lvs"];
        let lvt = creep.memory["lvt"];
        this.__creeprundouser(creep);
        //如果目标或源为空的处理
        let target;
        if (targetid)
            target = this.getObjectById(targetid);
        if (!target) {
            if (enkindt != "spawn") {
                if (storage) {
                    target = storage;
                    creep.memory["targetid"] = storage.id;
                }
                else {
                    //没有随便找个空仓库
                    if (roomdata.storeupid) {
                        creep.memory["targetid"] = roomdata.storeupid;
                        target = this.getObjectById(creep.memory["targetid"]);
                    }
                }
            }
            if (!target && lvt > 0) {
                if (enkindt == "spawn") {
                    targetid = this._getTragetidSpawn(creep);
                    if (targetid == 999)
                        return; //这个回合补了
                    target = this.getObjectById(targetid);
                    this.addlog("shipcreep", " rolestep target spawn change  " + targetid, 20, target, creep.name, rolekey, targetid, sourceid);
                    if (!target) {
                        return;
                    }
                    creep.memory["targetid"] = targetid;
                }
            }
            targetid = creep.memory["targetid"];
            this.addlog("shipcreep", " target isnull reset to " + creep.memory["targetid"], 20, target, creep.name, rolekey, targetid, sourceid);
        }
        let source;
        if (sourceid)
            source = this.getObjectById(sourceid);
        if (!source) {
            source = this.__creeprunGetSourceid(creep);
            sourceid = creep.memory["sourceid"];
            this.addlog("shipcreep", " source empty " + creep.memory["sourceid"], 20, source, creep.name, rolekey, targetid, sourceid);
        }
        if (source && target
            && source.pos && target.pos && source.pos.isEqualTo(target) && rolekey != "backpower") {
            this.creepClearMemory(creep);
            this.addlog("shipcreep", " source.pos.isEqualTo(target) ", 20, source, creep.name, rolekey, targetid, sourceid);
            return;
        }
        if (!rolestep) {
            if (creep.store.getUsedCapacity() == 0)
                rolestep = "source";
            else
                //if (creep.store.getFreeCapacity() == 0)
                rolestep = "target";
            //else {
            //    //看哪个近点 
            //    if (!source) {
            //        rolestep = "target"
            //    }
            //    else if (!target) {
            //        rolestep = "source"
            //    }
            //    else {
            //        let neartarget = 999
            //        let nearsource = 999
            //        if (target && target.room && target.room.name == creep.room.name)
            //            neartarget = creep.pos.getRangeTo(target)
            //        else
            //            neartarget = 998
            //        if (source && source.room && source.room.name == creep.room.name)
            //            nearsource = creep.pos.getRangeTo(source)
            //        else
            //            nearsource = 998
            //        //如果离TARGET远 直接SOURCE
            //        if (neartarget == 998)
            //            rolestep = "source"
            //        else {
            //            if (neartarget < nearsource)
            //                rolestep = "target"
            //            else
            //                rolestep = "source"
            //        }
            //    }
            //}
            creep.memory["rolestep"] = rolestep;
        }
        this.addlog("shipcreep", " rolestep check " + rolestep + " " + sourceid + " " + targetid, 10, creep, creep.name, rolekey, targetid, sourceid);
        if (rolestep == "target") {
            this.AddLog(" tran  rolestep check1  :" + rolestep + targetid, 20, target);
            if (creep.store.getUsedCapacity() == 0) {
                rolestep = "source";
                creep.memory["rolestep"] = rolestep;
                if (enkindt == "spawn") {
                    delete creep.memory["targetid"];
                    //source = this.__creeprunGetSourceid(creep)
                    //delete creep.memory["sourceid"]//这里全删应该触发其它的了
                    this.addlog("shipcreep", " rolestep target store empty spawn ", 20, source, creep.name, rolekey, targetid, sourceid);
                }
                this.addlog("shipcreep", " rolestep target store empty  ", 20, null, creep.name, rolekey, targetid, sourceid);
                this.AddLog(" tran2  goto source     :", 20);
                return;
            }
            if (enkindt == "spawn" && roomdata.room.energyAvailable ==
                roomdata.room.energyCapacityAvailable) {
                this.addlog("shipcreep", " rolestep target spawn full  ", 20, null, creep.name, rolekey, targetid, sourceid);
                this.creepClearMemory(creep);
                return;
            }
            //if (enkindt == "spawn" && storage && targetid == storage.id)
            //    target = null
            if (target && enkindt == "spawn") {
                if (target.structureType != "extension" && target.structureType != "spawn") {
                    this.AddLog("test spawn target:" + target.structureType, 20, target);
                    target = null;
                }
            }
            if (!target || !target.store || target.store.getFreeCapacity() == 0) {
                delete creep.memory["targetid"];
                this.addlog("shipcreep", " rolestep target target full   " + targetid, 20, target, creep.name, rolekey, targetid, sourceid);
                if (enkindt == "spawn") {
                    return;
                }
                if (roomname)
                    delete this.memoryclass[roomname]["t"][targetid];
                creep.memory["lvt"] = -1;
                this.creepClearMemory(creep);
                return;
            }
            //补到多少 fullnum keepnum
            if (enkindt != "spawn" && target && target.store) {
                let fullnum = creep.memory["fullnumt"];
                let entype = creep.memory["entypet"];
                let storenum = target.store.getUsedCapacity(entype);
                if (fullnum > 0 && storenum > fullnum) {
                    this.addlog("shipcreep", " rolestep target target full  fullnum  " + targetid, 20, target, creep.name, rolekey, targetid, sourceid);
                    delete this.memoryclass[roomname]["t"][targetid];
                    delete creep.memory["targetid"];
                    creep.memory["lvt"] = -1;
                    this.creepClearMemory(creep);
                    this.AddLog("Creep target  full fullnum:"
                        + storenum + " " + fullnum, 40, creep.pos);
                    return;
                }
            }
            if (!creep.pos.isNearTo(target)) {
                //let startdes = null;// this._getstorage(roomname).pos
                //if (source)
                //    startdes = source.pos
                if (!target) {
                    this.AddLog(" tran    moveTo target target empty    :" + rolestep, 40, creep.pos);
                    //this.creepClearMemory(creep)
                    return;
                }
                //if (creep.memory["isdebug"])
                //if (creep.memory["istest"])
                //    global.RoleCenter.move78.moveTo(creep, targetid, startdes)
                //else
                creep.moveTo(target);
                this.addlog("shipcreep", " rolestep target moveto " + targetid, 20, target, creep.name, rolekey, targetid, sourceid);
                //this.move78(creep, target.pos, 1, startdes)
                //else
                //this.moveto78(creep, target.pos, 1, startdes)
                this.AddLog(" tran target  moveTo     :" + rolestep, 20, target.pos);
                return;
            }
            let entype = creep.memory["entypet"] || RESOURCE_ENERGY;
            let tmp;
            for (let type in creep.store) {
                let typeget = type;
                if (entype == RESOURCE_ENERGY && typeget != RESOURCE_ENERGY) {
                    tmp = creep.drop(typeget);
                }
                else
                    tmp = creep.transfer(target, typeget);
            }
            this.addlog("shipcreep", " transfer  " + tmp, 20, target, creep.name, rolekey, targetid, sourceid);
            //let tmp = creep.transfer(target, RESOURCE_ENERGY);
            if (tmp == ERR_FULL) {
                delete creep.memory["targetid"];
                this.addlog("shipcreep", enkindt + " rolestep target fill full " + targetid, 20, target, creep.name, rolekey, targetid, sourceid);
                if (enkindt != "spawn") {
                    //rolestep = "source";
                    //creep.memory["rolestep"] = rolestep;
                    this.creepClearMemory(creep);
                    if (roomname && this.memoryclass[roomname] && this.memoryclass[roomname]["t"])
                        delete this.memoryclass[roomname]["t"][targetid];
                    this.AddLog("Creep   target full:" + this.logleave + targetid + " " + sourceid, 20, creep.pos);
                    return;
                }
                else {
                    targetid = this._getTragetidSpawn(creep);
                    if (targetid == 999)
                        return; //这个回合补了
                }
            }
            this.AddLog(" tran target  do     :" + tmp + rolestep + targetid, 20, creep.pos);
            return;
        }
        if (rolestep == "source") {
            if (creep.store.getFreeCapacity() == 0) {
                if (enkindt == "spawn")
                    delete creep.memory["targetid"];
                rolestep = "target";
                creep.memory["rolestep"] = rolestep;
                this.addlog("shipcreep", enkindt + " rolestep source empty to target " + targetid, 20, target, creep.name, rolekey, targetid, sourceid);
                return;
            }
            //if (source && source.room) {
            //    //let roomtmp: BaseRoom = this.room78s[source.room.name]
            //    //if (roomtmp.creepsother && Object.keys(roomtmp.creepsother).length >= 1) {
            //    //    if (target) creep.moveTo(target)
            //    //    else creep.moveTo(this._getstorage(creep))
            //    //    return
            //    //}
            //}
            if (!source) { // (!source && lvs > 0)
                this.addlog("shipcreep", enkindt + " rolestep source  unkown " + targetid, 20, target, creep.name, rolekey, targetid, sourceid);
                delete creep.memory["sourceid"];
                this.creepClearMemory(creep);
                this.AddLog("Creep sourceid  empty:" + this.logleave + targetid + " " + sourceid, 20, creep.pos);
                return;
            }
            //留到多少   keepnum
            if (source && source.store) {
                let keepnum = creep.memory["keepnums"] || 10;
                let entype = creep.memory["entypes"] || RESOURCE_ENERGY;
                if (entype == "ext")
                    entype = "";
                let storenum = source.store.getUsedCapacity(entype);
                if (storenum <= keepnum) {
                    this.addlog("shipcreep", enkindt + " rolestep source  <=keepnum " + sourceid, 20, source, creep.name, rolekey, targetid, sourceid);
                    delete creep.memory["sourceid"];
                    this.creepClearMemory(creep);
                    this.AddLog("Creep sourceid store keepnum over:"
                        + this.logleave + storenum + " " + keepnum, 20, source);
                    return;
                }
            }
            //if (source && source["store"] && source["store"].getUsedCapacity() < 100) {
            //    delete creep.memory["sourceid"];
            //    this.creepClearMemory(creep)
            //    this.AddLog("Creep sourceid store empty:" + this.logleave + targetid + " " + sourceid
            //        , 20, creep.pos);
            //    return;
            //}
            if (!creep.pos.isNearTo(source)) {
                if (target)
                    target.pos;
                if (!source) {
                    this.addlog("shipcreep", enkindt + " rolestep source moveto sourceempty " + sourceid, 20, source, creep.name, rolekey, targetid, sourceid);
                    this.AddLog(" tran source  moveTo sourceempty    :" + rolestep, 20, source);
                    this.creepClearMemory(creep);
                    return;
                }
                //if (creep.memory["isdebug"])
                //if (creep.memory["istest"])
                //    global.RoleCenter.move78.moveTo(creep, sourceid, startpos)
                //else
                creep.moveTo(source);
                //this.move78(creep, source.pos, 1, startpos)
                //else
                //    this.moveto78(creep, source.pos, 1, startpos)
                this.AddLog(" tran source  moveTo     :" + rolestep, 20, source.pos);
                return;
            }
            let tmp;
            let entype = creep.memory["entypes"];
            if (entype == "ext") {
                if (source.store) {
                    for (let type in source.store) {
                        let typeget = type;
                        tmp = creep.withdraw(source, typeget);
                    }
                }
            }
            else
                tmp = creep.withdraw(source, RESOURCE_ENERGY);
            if (tmp != 0) {
                tmp = creep.pickup(source);
            }
            if (tmp != 0) {
                if (this.memoryclass[roomname]) {
                    delete this.memoryclass[roomname]["s"][sourceid];
                }
                this.addlog("shipcreep", enkindt + " rolestep source geterr " + sourceid, 20, source, creep.name, rolekey, targetid, sourceid);
                delete creep.memory["sourceid"];
            }
            this.AddLog(" tran source withdraw  do  normal   :" + tmp + rolestep + sourceid, 20, creep.pos);
            return;
        }
    }
    __creeprunGetTargetid(creep) {
        let target;
        //默认罐子
        let roomdata = this.roomdatas.getRoomdata(creep.room.name);
        let storage = roomdata.getstorage();
        this.AddLog("Creeprum source empty   :", 10, storage);
        if (storage) {
            target = this.getObjectById(storage.id);
            creep.memory["targetid"] = storage.id;
            return target;
        }
        //没有随便找个仓库
        let contains = roomdata.getstructByType(STRUCTURE_CONTAINER);
        let tmpsource;
        let maxenergy = 0;
        this.AddLog("Creeprum source empty  storage empty contains test  :", 10, contains);
        for (let tmpsouceid in contains) {
            let tmpid = tmpsouceid;
            tmpsource = this.getObjectById(tmpid);
            this.AddLog("Creeprum source empty  storage empty contains test  :" + tmpsource.store[RESOURCE_ENERGY]
                + " " + maxenergy, 10, contains);
            if (tmpsource.store.getFreeCapacity() > maxenergy) {
                maxenergy = tmpsource.store.getFreeCapacity();
                creep.memory["targetid"] = tmpid;
                target = tmpsource;
            }
        }
        this.AddLog("Creeprum source empty  storage empty storeoceid  :", 10, target);
        if (!target) {
            //找附近的
            let nexts = this.getNextRooms(creep.room.name);
            if (nexts) {
                for (var i = 0; i < nexts.length; i++) {
                    let nextname = nexts[i];
                    let roomdata = this.roomdatas.getRoomdata(nextname);
                    if (!roomdata)
                        continue;
                    contains = roomdata.getstructByType(STRUCTURE_CONTAINER);
                    for (let tmpsouceid in contains) {
                        let tmpid = tmpsouceid;
                        tmpsource = this.getObjectById(tmpid);
                        this.AddLog("Creeprum source empty  storage empty contains test  :" + tmpsource.store[RESOURCE_ENERGY]
                            + " " + maxenergy, 10, contains);
                        if (tmpsource.store.getFreeCapacity() > maxenergy) {
                            maxenergy = tmpsource.store.getFreeCapacity();
                            creep.memory["targetid"] = tmpid;
                            target = tmpsource;
                        }
                    }
                }
            }
        }
        return target;
    }
    __creeprunGetSourceid(creep) {
        let source;
        //默认罐子
        let roomdata = this.roomdatas.getRoomdata(creep.room.name);
        let storage = roomdata.getstorage();
        this.AddLog("Creeprum source empty   :", 10, storage);
        if (storage) {
            source = this.getObjectById(storage.id);
            creep.memory["sourceid"] = storage.id;
        }
        else {
            //没有随便找个仓库
            let contains = roomdata.getstructByType(STRUCTURE_CONTAINER);
            let tmpsource;
            let maxenergy = 0;
            this.AddLog("Creeprum source empty  storage empty contains test  :", 10, contains);
            for (let tmpsouceid in contains) {
                let tmpid = tmpsouceid;
                tmpsource = this.getObjectById(tmpid);
                this.AddLog("Creeprum source empty  storage empty contains test  :" + tmpsource.store[RESOURCE_ENERGY]
                    + " " + maxenergy, 10, contains);
                if (tmpsource.store[RESOURCE_ENERGY] > maxenergy) {
                    maxenergy = tmpsource.store[RESOURCE_ENERGY];
                    creep.memory["sourceid"] = tmpid;
                    source = tmpsource;
                }
            }
            this.AddLog("Creeprum source empty  storage empty storeoceid  :", 10, source);
            //这里要改成获取一个能量源
            for (let tmpsouceid in this.getMemoryclass()[creep.room.name]["s"]) {
                let roletmp = this.getMemoryclass()[creep.room.name]["s"][tmpsouceid];
                let tmpid = roletmp["roletargetid"];
                //tmpsource = this.getObjectById(tmpid)
                if (roletmp["neednum"] > maxenergy) {
                    maxenergy = roletmp["neednum"];
                    creep.memory["sourceid"] = tmpid;
                    source = tmpsource;
                }
            }
        }
        return source;
    }
    /**
     * 处理douser
     * */
    __creeprundouser(creep) {
        let lvs = creep.memory["lvs"];
        let lvt = creep.memory["lvt"];
        let targetid = creep.memory["targetid"];
        let sourceid = creep.memory["sourceid"];
        let roomname = creep.memory["roomname"];
        if (!roomname || !this.memoryclass[roomname] || !this.memoryclass[roomname]["s"]) {
            return;
        }
        if (lvs > 0) {
            let role = this.memoryclass[roomname]["s"][sourceid + this.classname];
            //if (!role) {
            //    this.AddLog("__creeprundouser err role empty sourceid:"  + sourceid + this.classname, 50, creep.pos);
            //    return;
            //}
            this.AddLog("test __creeprundouser douser:" + sourceid + this.classname, 10, role);
            if (role && !role["dousers"][creep.name]) {
                role["dousers"][creep.name] = {
                    creepname: creep.name,
                    store: creep.store.getCapacity()
                };
            }
        }
        if (lvt > 0) {
            let role = this.memoryclass[roomname]["t"][targetid + this.classname];
            let enkindt = creep.memory["enkindt"];
            if (enkindt == "spawn")
                role = this.memoryclass[roomname]["t"][roomname + enkindt + this.classname];
            //if (!role) {
            //    this.AddLog("__creeprundouser err role empty:" + enkindt + targetid + this.classname, 50, creep.pos);
            //    return;
            //}
            if (role && !role["dousers"][creep.name]) {
                role["dousers"][creep.name] = {
                    creepname: creep.name,
                    store: creep.store.getCapacity()
                };
            }
        }
    }
    _getTragetidSpawn(creep) {
        let targetid;
        creep.memory["lvt"];
        let roomname = creep.room.name;
        let room78 = this.roomdatas.getRoomdata(roomname);
        //if (!room78 || !room78.spawnname) 
        if (!room78) {
            this.AddLog(" room78 is empty  :" + roomname, 40, creep.pos);
            this.creepClearMemory(creep);
            return "";
        }
        let spawn;
        if (room78.spawnname) {
            spawn = Game.spawns[room78.spawnname];
        }
        //spawn = Game.spawns[room78.spawnname]
        //this.AddLog(" tranauto _getTragetidSpawn   find  CHECK  :"
        //    + roomname + spawn.store.getFreeCapacity(RESOURCE_ENERGY), 10, spawn);
        //extend最近的
        let structs = room78.getstructByType("extension");
        this.AddLog(" tranauto targetid extension find   :" + targetid, 10, structs);
        let nearmax = 999;
        if (spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            nearmax = creep.pos.getRangeTo(spawn.pos);
            targetid = spawn.id;
            return targetid;
        }
        for (let key in structs) {
            let stuid = key;
            let structtmp = this.getObjectById(stuid); // structs[ckey]
            //let structtmp = structs[key]
            if (structtmp["store"].getFreeCapacity(RESOURCE_ENERGY) == 0)
                continue;
            if (creep.pos.isNearTo(structtmp)) {
                if (creep.store.getUsedCapacity() == 0)
                    return structtmp.id;
                creep.transfer(structtmp, RESOURCE_ENERGY);
                this.AddLog(" tranauto targetid extension isnear do over   :"
                    + structtmp["store"].getFreeCapacity(RESOURCE_ENERGY), 10, structtmp.pos);
                return 999;
            }
            this.AddLog(" tranauto targetid extension find   :"
                + structtmp["store"].getFreeCapacity(RESOURCE_ENERGY), 0, structtmp.pos);
            let nearnow = creep.pos.getRangeTo(structtmp.pos);
            if (nearnow < nearmax) {
                nearmax = nearnow;
                targetid = structtmp.id;
                this.AddLog(" tran transpawn change transpawn_extend :"
                    + nearnow + " " + structtmp.id, 20, structtmp.pos);
            }
            if (nearmax == 0)
                break;
        }
        if (targetid) {
            creep.memory["targetid"] = targetid;
            return targetid;
        }
        return targetid;
    }
    /**
    * 只保留ckind
    * @param creep
    */
    creepClearMemory(creep) {
        let ckind = creep.memory["ckind"];
        let targetid = creep.memory["targetid"];
        let rolekind = creep.memory["rolekind"];
        let sourceid = creep.memory["sourceid"];
        let roomname = creep.memory["roleroom"];
        let isdebug = creep.memory["isdebug"];
        if (roomname) {
            if (!this.memoryclass[roomname])
                this.memoryclass[roomname] = {};
            if (!this.memoryclass[roomname]["s"])
                this.memoryclass[roomname]["s"] = {};
            if (!this.memoryclass[roomname]["t"])
                this.memoryclass[roomname]["t"] = {};
            let roomrole = this.memoryclass[roomname]["s"];
            if (sourceid && roomrole && roomrole[sourceid])
                delete roomrole[sourceid]["dousers"][creep.name];
            roomrole = this.memoryclass[roomname]["t"];
            if (targetid && roomrole && roomrole[targetid] && roomrole[targetid]["douser"]) {
                this.AddLog("creepClearMemory :" + targetid, 10, creep.pos);
                delete roomrole[targetid]["douser"][creep.name];
            }
        }
        delete Memory.creeps[creep.name];
        creep.memory["ckind"] = ckind;
        //creep.memory["roomname"] = creep.room.name
        creep.memory["local"] = creep.room.name;
        creep.memory["rolekind"] = rolekind;
        creep.memory["isdebug"] = isdebug;
        //不要站在路上
        if (creep.memory["isnotrold"])
            return;
        const found = creep.pos.look();
        this.AddLog(" test isnotrold:"
            + creep.memory["isnotrold"], 10, creep.pos);
        let isnotrold = true;
        for (let m = 0; m < found.length; m++) {
            let type = found[m]["type"];
            if (type == "structure") {
                let structureType = found[m]["structure"]["structureType"];
                if (structureType == "road") {
                    isnotrold = false;
                    break;
                }
            }
        }
        //this.AddLog(" test:" + isnotrold, 10, found);
        if (isnotrold) {
            creep.memory["isnotrold"] = 1;
            return;
        }
        //看附近哪有没有路的地方 随便站过去就行了
        for (var x = -1; x < 1; x++) {
            for (var y = -1; y < 1; y++) {
                if (x == 0 && y == 0)
                    continue;
                let nextdes = new RoomPosition(creep.pos.x + x, creep.pos.y + y, creep.room.name);
                const found = creep.pos.look();
                let isnotrold = true;
                for (let m = 0; m < found.length; m++) {
                    let type = found[m]["type"];
                    if (type == "structure") {
                        let structureType = found[m]["structure"]["structureType"];
                        if (structureType == "road") {
                            isnotrold = false;
                            break;
                        }
                    }
                }
                if (!isnotrold)
                    continue;
                creep.moveTo(nextdes);
            }
        }
    }
    /**
    * 添加请求
    * @param targetid
    * @param st
    * @param enkind
    * @param neednum
    * @param entype
    * @param fullnum 补到多少
    * @param keepnum 留多少
    * @param sourceid 直接指定了对向的id指定运输 优先级定高点 不给改
    * @param roomnamein spawn没有roomname必须指定
    */
    addplan(targetid, st, enkind, neednum, entype = "energy", fullnum = 0, keepnum = 0, sourceid = "", roomnamein = "") {
        let creeps = this.roomdatas.creeps[this.classname];
        this.addlog("ship78addplan", targetid + " " + st + " " + enkind, 20, null, targetid);
        //添加任务
        let role = this.role_addplan(targetid, st, enkind, neednum, entype, fullnum, keepnum, sourceid, roomnamein);
        this.AddLog("  addplan  init :" + targetid + st
            + enkind, 20, this.memoryclass);
        if (!role) {
            this.AddLog("  addplan  role empty :" + targetid + st
                + enkind, 50);
            return;
        }
        if (st == "t") {
            this._addplanTchangeS(role, st, neednum, enkind, keepnum, fullnum, entype, sourceid);
            this._addplanCheckdouser(role, st, enkind, neednum, sourceid);
            if (role["localcreep"] >= 1) {
                this.spawn78.delplan(role["rolekey"]);
                return;
            }
            let isadd = this._addplanfindcreept(role, st, neednum, enkind, keepnum, fullnum, entype, sourceid);
            if (!isadd)
                this.spawn78.delplan(role["rolekey"]);
            return;
        }
        //if (enkind == "spawn")
        //    this.logleave = 25;
        //else
        //    this.logleave = this.logleaveAuto
        this.AddLog("addplan  roleget :" + targetid + st + " " + enkind, 25);
        this.addlog("ship78addplans", " _addplandousernum init:" + targetid, 10, role, targetid);
        //调度是否需要增加 爬个数 不return就是增加
        if (!this._addplandousernum(role, st, enkind, neednum, sourceid)) {
            this.spawn78.delplan(role["rolekey"]);
            return;
        }
        this.addlog("ship78addplans", " _addplandousernum ok:" + targetid, 10, role, targetid);
        //找到一个爬
        if (!this._addplanfindcreep(role, st, neednum, enkind, keepnum = 0, fullnum = 0, entype = "energy", sourceid = "")) {
            this.spawn78.delplan(role["rolekey"]);
            return;
        }
        this.addlog("ship78addplans", " _addplanfindcreep ok:" + targetid, 10, role, targetid);
        //最后再判断要不要申请
        let roomname = role["roomname"];
        let rolekey = role["rolekey"];
        let createlvtmp = this.createlv;
        if (!creeps || Object.keys(creeps).length <= 2) {
            createlvtmp += 70;
            //this.AddLog("addplan  this.creeps <=2 check creeps isempty:" + this.shipstore, 50, creeps)  
        }
        let lv = role["lv"];
        //没找到 请求新建 //如果一个都没了 就加30
        this.spawn78.addplan(rolekey, createlvtmp, {
            memory: {
                rolekind: this.classname,
                roleroom: roomname,
                rolekey: rolekey //唯一标记
                ,
                ckind: this.botkind //有可能一种机型不同的任务的
                ,
                sourceid: targetid,
                lvs: lv, entypes: entype,
                keepnumt: keepnum,
                fullnumt: fullnum
            }
        });
        this.addlog("ship78addplan", " spawn78.addplan:", 20, null, sourceid);
        this.AddLog("  addplan  check over not find reqlistadd:" + roomname
            + enkind, 26, role);
    }
    /**
     * T任务锁定S 几个回合判断一次
     * .同房间的 与T最近的S
     * .不同房间的话 取最多的S(一般应该有 几回合判断一次很快就会出来应该)
     * */
    _addplanTchangeS(role, st, neednum, enkind, keepnum = 0, fullnum = 0, entype = "energy", sourceid = "") {
        role["sourceid"];
        let rolekey = role["rolekey"];
        //if (tsourceid && !this.iscanref(rolekey)) { 
        //    return;
        //}
        let roomname = role["roomname"];
        let roletargetid = role["roletargetid"];
        let room78 = this.roomdatas.getRoomdata(roomname);
        if (enkind == "spawn") {
            roletargetid = Game.spawns[room78.spawnname].id;
        }
        let target = this.getObjectById(roletargetid);
        //先找本房间的最近的S
        let newsourceid, newsource, newlv;
        let nearmax = 99999;
        this.AddLog("test _addplanTchangeS:" + roletargetid, 20, target.pos);
        for (let rolename in this.memoryclass[roomname]["s"]) {
            let roletmp = this.memoryclass[roomname]["s"][rolename];
            let tmpid = roletmp["roletargetid"];
            let tmplv = roletmp["lv"];
            let sourceobj = this.getObjectById(tmpid);
            if (!sourceobj) {
                this.addlog("ship78addplan", "_addplanTchangeS roletargetid empty:", 20, roletmp, rolekey);
                this.AddLog("err _addplanTchangeS: source empty" + tmpid, 20, sourceobj);
                continue;
            }
            let neartmp = target.pos.getRangeTo(sourceobj);
            let store = roletmp["store"];
            let isentypeok = false;
            let roleentype = role["entype"];
            for (let entypetmp in store) {
                if (roleentype == entypetmp) {
                    isentypeok = true;
                    break;
                }
            }
            if (!isentypeok) {
                this.addlog("ship78addplan", "_addplanTchangeS !isentypeok:" + sourceid, 20, roletmp, rolekey);
                continue;
            }
            if (store && !store["energy"]) {
                delete this.memoryclass[roomname]["s"][rolename];
                this.addlog("ship78addplan", "_addplanTchangeS store no energy del s:", 20, roletmp, rolekey);
                this.AddLog(" creep run delete s  rolename:" + sourceid, 90, sourceobj);
                continue;
            }
            if (store["energy"] < 500)
                continue;
            this.AddLog(nearmax + "_addplanTchangeS:" + neartmp
                + tmpid, 20, sourceobj);
            if (neartmp < nearmax) {
                this.addlog("ship78addplan", newsourceid + "_addplanTchangeS neartmp < nearmax:" + tmpid, 20, sourceobj, rolekey);
                nearmax = neartmp;
                newsourceid = tmpid;
                newsource = sourceobj;
                newlv = tmplv;
            }
        }
        if (!newsourceid) {
            if (room78.room.storage && room78.room.storage.store["energy"] >= 500) {
                newsourceid = room78.room.storage.id;
                newsource = room78.room.storage;
                this.addlog("ship78addplan", "_addplanTchangeS !newsourceid:", 20, null, rolekey);
            }
        }
        //补仓要把仓库和罐子加进来
        if (enkind == "spawn") {
            let storage = room78.room.storage;
            if (storage && storage.store["energy"] >= 500) {
                let neartmp = target.pos.getRangeTo(room78.room.storage);
                if (neartmp < nearmax) {
                    nearmax = neartmp;
                    newsourceid = room78.room.storage.id;
                    newsource = room78.room.storage;
                    newlv = -1;
                    this.addlog("ship78addplan", newsourceid + "_addplanTchangeS neartmp < nearmax:"
                        + newsourceid, 20, room78.room.storage, rolekey);
                }
            }
        }
        if (newsourceid && role["sourceid"] != newsourceid) {
            role["sourceid"] = newsourceid;
            role["spos"] = newsource["pos"];
            role["sstore"] = newsource["store"];
            role["slv"] = newlv;
            this.addlog("ship78addplan", "_addplanTchangeS  newsourceid set :" + newsourceid, 20, newsource, rolekey);
            for (let creepname in role["dousers"]) {
                let creep = Game.creeps[creepname];
                if (creep) {
                    creep.memory["lvs"] = newlv;
                    creep.memory["entypes"] = entype;
                    creep.memory["enkinds"] = "t";
                    creep.memory["keepnums"] = 0;
                    creep.memory["sourceid"] = newsourceid;
                }
            }
            return;
        }
    }
    /**
     * 如果是T任务
     * .先确定最近的S T和S同优先级
     * .隔几个回合检查一次 看有没有更近的爬 如果爬是满资源 距离以T 如果爬是空资源 距离以S计
     * */
    _addplanfindcreept(role, st, neednum, enkind, keepnum = 0, fullnum = 0, entype = "energy", sourceid = "") {
        //return true
        let repcreep = role["repcreep"];
        let roomname = role["roomname"];
        let rolekey = role["rolekey"];
        let roletargetid = role["roletargetid"];
        let findcreep = "";
        //先看本房间有没有即可 再看roomname同的 再看隔壁的  后面再检查任务等级比当前低的 
        findcreep = this._getcreept(roomname, role, st);
        this.AddLog("addplan  find this room findcreep:" + findcreep + roomname, 26);
        let nexts = this.getNextRooms(roomname);
        let findnear = 0; //看找的是隔壁还是隔壁的隔壁决定是不是要换 997隔壁 998隔壁的隔壁
        if (!findcreep) {
            for (var i = 0; i < nexts.length; i++) {
                findcreep = this._getcreept(nexts[i], role, st);
                if (findcreep) {
                    findnear = 997;
                    break;
                }
            }
        }
        this.AddLog("addplan  find next room findcreep:" + findcreep + roomname, 26, nexts);
        if (!findcreep) {
            //再隔壁的隔壁  
            for (var i = 0; i < nexts.length; i++) {
                let nexts2 = this.getNextRooms(nexts[i]);
                for (var j = 0; j < nexts2.length; j++) {
                    findcreep = this._getcreept(nexts2[j], role, st);
                    if (findcreep) {
                        findnear = 998;
                        break;
                    }
                }
            }
        }
        this.AddLog("addplan  find next nextroom findcreep:" + findcreep + roomname, 25);
        role["refnear"];
        let lv = role["lv"];
        //if (findcreep && role["findcreep"] && role["findcreep"] != findcreep) {
        //    return 
        //}
        //找出来再判断是替换还是加上
        if (findcreep) {
            //如果有不在本房间的douser 且加一个后处理能力大了 就要替换
            if (repcreep && repcreep != findcreep) {
                //if (refnear <= findnear) return;//没必要换
                let creeptmp = Game.creeps[repcreep];
                delete role["dousers"][repcreep];
                if (st == "s") {
                    delete creeptmp.memory["sourceid"];
                    delete creeptmp.memory["lvs"];
                    delete creeptmp.memory["enkinds"];
                }
                else {
                    delete creeptmp.memory["targetid"];
                    delete creeptmp.memory["lvt"];
                    delete creeptmp.memory["enkindt"];
                }
            }
            let creep = Game.creeps[findcreep];
            this.AddLog("addplan  find next nextroom findcreep:" + findcreep + roomname, 27, creep);
            role["dousers"][findcreep] = {
                creepname: findcreep, near: findnear,
                store: creep.store.getCapacity()
            };
            if (!creep.memory["rolekey"]) {
                creep.memory["rolekey"] = rolekey;
            }
            creep.memory["trolekey"] = rolekey;
            creep.memory["lvt"] = lv;
            creep.memory["entype" + st] = entype;
            creep.memory["keepnum" + st] = keepnum;
            creep.memory["fullnum" + st] = fullnum;
            creep.memory["rolekind"] = this.classname;
            creep.memory["roomname"] = role["roomname"];
            if (enkind != "spawn")
                creep.memory["targetid"] = role["roletargetid"];
            else {
                //if (creep.memory["enkindt"] != enkind)
                //    creep.memory["targetid"] = role["roletargetid"]
                if (enkind != creep.memory["enkindt"])
                    delete creep.memory["targetid"];
                this.addlog("ship78addplan", " findcreep test check enkind:" + creep.name
                    + creep.memory["enkindt"] + enkind + creep.memory["targetid"], 20, creep, sourceid, roletargetid, creep.name);
            }
            creep.memory["enkind" + st] = enkind;
            //S也一起安排了
            creep.memory["lvs"] = lv;
            creep.memory["entypes"] = entype;
            creep.memory["enkinds"] = "t";
            creep.memory["keepnums"] = 0;
            creep.memory["sourceid"] = role["sourceid"];
            if (role["findcreep"] != creep.name) {
                delete creep.memory["rolestep"];
                role["findcreep"] = creep.name;
            }
            this.addlog("ship78addplan", roletargetid + " findcreep ok:" + creep.name, 27, creep, sourceid, roletargetid, creep.name);
            this.AddLog("test _addplanfindcreept change:" + rolekey, 27, creep.pos);
            return false;
        }
        //新建
        let creeps = this.roomdatas.creeps[this.classname];
        let createlvtmp = this.createlv;
        if (!creeps || Object.keys(creeps).length <= 1) {
            createlvtmp += 70;
            //this.AddLog("addplan  this.creeps <=2 check creeps isempty:" + this.shipstore, 50, creeps)
        }
        this.addlog("ship78addplan", " t addplan  check over not find reqlistadd:" + roomname
            + enkind, 10, creeps, sourceid, roletargetid, roomname, rolekey);
        //没找到 请求新建 //如果一个都没了 就加30
        this.spawn78.addplan(rolekey, createlvtmp, {
            memory: {
                rolekind: this.classname,
                roleroom: roomname,
                rolekey: rolekey //唯一标记
                ,
                ckind: this.botkind //有可能一种机型不同的任务的
                ,
                targetid: sourceid,
                lvt: lv, entypet: entype,
                enkindt: enkind, keepnumt: keepnum,
                fullnumt: fullnum,
                lvs: lv, entypes: entype,
                enkinds: "t", keepnums: 0
            }
        });
        this.addlog("ship78addplan", " spawn78.addplan t:" + rolekey, 20, null, sourceid, roletargetid);
        //this.AddLog("test _addplanfindcreept addplan create:" + rolekey, 50 )
        this.AddLog("  addplan  check over not find reqlistadd:" + roomname
            + enkind, 26, role);
        return true;
    }
    /**
     * 添加任务 ok
     * */
    role_addplan(targetid, st, enkind, neednum, entype = "energy", fullnum = 0, keepnum = 0, sourceid = "", roomnamein = "") {
        this.AddLog("  addplan2 in roomrole:" +
            this.logleave + enkind + targetid + roomnamein, 20);
        let target = this.getObjectById(targetid);
        let roomname = roomnamein;
        if (target)
            roomname = target.room.name;
        if (!target && enkind != "spawn")
            return;
        this.logleave = this.logleaveAuto;
        if (!this.getMemoryclass()[roomname])
            this.getMemoryclass()[roomname] = {};
        if (!this.getMemoryclass()[roomname][st])
            this.getMemoryclass()[roomname][st] = {};
        let roomrole = this.getMemoryclass()[roomname][st];
        this.AddLog("  addplan2 in target:" + enkind + targetid + neednum, 10, target);
        this.AddLog("  addplan2 in roomrole:" +
            this.logleave + roomname + enkind + targetid, 26, roomrole);
        let lv = 50;
        let rolekey = targetid;
        if (enkind == "spawn")
            rolekey = roomnamein + enkind;
        rolekey += this.classname;
        switch (enkind) {
            case "terminal": //t
            case "tower": //t
                lv = 100;
                break;
            case "spawn": //t
                lv = 99;
                break;
            case "linkstorage": //t
                lv = 85;
                break;
            case "storecreep": //t
                lv = 75;
                break;
            case "storeup": //t 
                lv = 70;
                //if (room78.linkup)//直接请求的时候换
                //    id = room78.linkstorage
                break;
            case "sourceext":
                lv = 90;
                break;
            case "resoucebig": //s捡的大资源
                lv = 86;
                if (neednum < 200)
                    lv = 20;
                break;
            case "sourcenormal": //s可能是边缘
                lv = 20;
                break;
            case "sourceoce": //s有在挖矿的池子
                lv = 30;
                if (neednum >= 1500)
                    lv = 60;
                else if (neednum >= 800)
                    lv = 40;
                break;
            default:
                this.AddLog("  addplan  kind err:" + enkind, 40, target);
                return;
        }
        //不能一边补一边拉 如果有s==t的 清空爬的sourceid
        //if (st == "t") {
        //this.AddLog("  addplan  check s ==t:"
        //    + (this.memoryclass[roomname]["s"][id]), 0
        //    , this.memoryclass[roomname]["s"])
        //if (this.memoryclass[roomname]["s"][id]) {
        //    let dousers = this.memoryclass[roomname]["s"][id]["dousers"]
        //    this.AddLog("  addplan  check s ==t dousers:" + id, 0
        //        , dousers)
        //    for (let cpname in dousers) {
        //        let creep: Creep = Game.creeps[cpname]
        //        if (creep) {
        //            delete creep.memory["sourceid"]
        //            delete creep.memory["lvs"]
        //        }
        //    }
        //    delete this.memoryclass[roomname]["s"][id]
        //}
        //}
        //看是不是新的
        let role;
        if (!roomrole[rolekey]) {
            this.getMemoryclass()[roomname][st][rolekey] = {
                rolekey: rolekey, enkind: enkind,
                roomname: roomname, id: rolekey,
                lv: lv, neednum: neednum, entype: entype,
                dousers: {},
                roletargetid: targetid
            };
            role = this.getMemoryclass()[roomname][st][rolekey];
            this.AddLog("  addplan2 test33 add role:" + roomname, 20, Memory["rolelist78"][this.classname][roomname]);
            //this.AddLog("  addplan2 test33 add role22:" + roomname, 29, this.getMemoryclass()[roomname])
        }
        else {
            role = roomrole[rolekey];
            //交易中心补货 一次只补一个类型
            if (enkind == "terminal" && role["entype"] && role["entype"] != entype)
                return;
            role["lv"] = lv;
            role["rolekey"] = rolekey;
            role["enkind"] = enkind;
            role["roomname"] = roomname;
            role["id"] = rolekey;
            role["neednum"] = neednum;
            role["entype"] = entype;
        }
        if (enkind != "spawn") {
            role["pos"] = target.pos;
            if (target.store)
                role["store"] = target.store;
            else {
                //资源
                role["store"] = {};
                role["store"][target.resourceType] = target.amount;
            }
        }
        role["keepnum"] = keepnum;
        role["fullnum"] = fullnum;
        this.addlog("ship78addplan", targetid + " " + st + " " + enkind, 20, role, targetid, rolekey);
        this.AddLog("  addplan2 test33 role:" + enkind, 20, role);
        return role;
    }
    _addplanfindcreep(role, st, neednum, enkind, keepnum = 0, fullnum = 0, entype = "energy", sourceid = "") {
        let repcreep = role["repcreep"];
        let roomname = role["roomname"];
        let rolekey = role["rolekey"];
        let roletargetid = role["roletargetid"];
        let findcreep = "";
        //if (enkind == "spawn")
        //    this.logleave = 10;
        //else
        //    this.logleave = this.logleaveAuto
        //先看本房间有没有即可 再看roomname同的 再看隔壁的  后面再检查任务等级比当前低的
        findcreep = this._getcreep(roomname, role, st);
        this.AddLog(roomname + "addplan  find this room findcreep:" + findcreep, 26);
        let nexts = this.getNextRooms(roomname);
        let findnear = 0; //看找的是隔壁还是隔壁的隔壁决定是不是要换 997隔壁 998隔壁的隔壁
        if (!findcreep) {
            for (var i = 0; i < nexts.length; i++) {
                findcreep = this._getcreep(nexts[i], role, st);
                if (findcreep) {
                    findnear = 997;
                    break;
                }
            }
        }
        this.AddLog("addplan  find next room findcreep:" + findcreep + roomname, 26, nexts);
        if (!findcreep) {
            //再隔壁的隔壁  
            for (var i = 0; i < nexts.length; i++) {
                let nexts2 = this.getNextRooms(nexts[i]);
                for (var j = 0; j < nexts2.length; j++) {
                    findcreep = this._getcreep(nexts2[j], role, st);
                    if (findcreep) {
                        findnear = 998;
                        break;
                    }
                }
            }
        }
        this.AddLog("addplan  find next nextroom findcreep:" + findcreep + roomname, 25);
        let dousernum = Object.keys(role["dousers"]).length;
        let refnear = role["refnear"];
        let lv = role["lv"];
        //找出来再判断是替换还是加上
        if (findcreep) {
            //如果有不在本房间的douser 且加一个后处理能力大了 就要替换
            if (repcreep && (dousernum + 1) * this.shipstore > neednum) {
                if (refnear <= findnear)
                    return; //没必要换
                let creeptmp = Game.creeps[repcreep];
                delete role["dousers"][repcreep];
                if (st == "s") {
                    delete creeptmp.memory["sourceid"];
                    delete creeptmp.memory["lvs"];
                    delete creeptmp.memory["enkinds"];
                }
                else {
                    delete creeptmp.memory["targetid"];
                    delete creeptmp.memory["lvt"];
                    delete creeptmp.memory["enkindt"];
                }
            }
            let creep = Game.creeps[findcreep];
            role["dousers"][findcreep] = {
                creepname: findcreep, near: findnear,
                store: creep.store.getCapacity()
            };
            this.addlog("ship78addplan", " _getcreep douser add:" + findcreep, 20, creep, findcreep, roletargetid);
            if (!creep.memory["rolekey"]) {
                creep.memory["rolekey"] = rolekey;
            }
            creep.memory["srolekey"] = rolekey;
            creep.memory["lv" + st] = lv;
            creep.memory["entype" + st] = entype;
            creep.memory["enkind" + st] = enkind;
            creep.memory["keepnum" + st] = keepnum;
            creep.memory["fullnum" + st] = fullnum;
            creep.memory["rolekind"] = this.classname;
            creep.memory["roomname"] = role["roomname"];
            delete creep.memory["rolestep"];
            //直接找到罐子
            let roomdata = this.roomdatas.getRoomdata(creep.room.name);
            let storage = roomdata.getstorage();
            let storageid;
            if (storage)
                storageid = storage.id;
            //let room78: BaseRoom = this.room78s[roomname]
            //if (room78.room.storage) {
            //    storageid = room78.room.storage.id
            //} else {
            //    //那就肯定有运输到的地方
            //    let targetroomname = this.reqlist9["rtranauto"][roomname]
            //    if (!this.room78s[targetroomname]) {
            //        this.AddLog("addplan err targetroomname undef:" + targetroomname, 40, creep.pos)
            //        return;
            //    }
            //    storageid = this.room78s[targetroomname].room.storage.id
            //}
            let olddouserids, olddouseridt;
            let refs = false;
            if (st == "t") {
                //分T时 s和T 必须在同一个房间 不是就清掉S
                olddouseridt = creep.memory["targetid"];
                if (olddouseridt) {
                    //清理任务表原来的targetid douser
                    if (this.memoryclass[roomname]
                        && this.memoryclass[roomname]["t"]
                        && olddouseridt && this.memoryclass[roomname]["t"][olddouseridt]) {
                        delete this.memoryclass[roomname]["t"][olddouseridt]["dousers"][creep.name];
                    }
                }
                if (enkind != "spawn")
                    creep.memory["targetid"] = role["roletargetid"];
                //else
                //    delete creep.memory["targetid"]
                let sourceid = creep.memory["sourceid"];
                let source = this.getObjectById(sourceid);
                if (source && source.room.name != roomname && storageid)
                    refs = true;
            }
            if (st == "s" || refs) {
                olddouserids = creep.memory["sourceid"];
                if (olddouserids) {
                    //清理任务表原来的sourceid douser
                    if (this.memoryclass[roomname]
                        && this.memoryclass[roomname]["s"]
                        && olddouserids && this.memoryclass[roomname]["s"][olddouserids]) {
                        delete this.memoryclass[roomname]["s"][olddouserids]["dousers"][creep.name];
                    }
                }
                if (st == "s") {
                    creep.memory["sourceid"] = role["roletargetid"];
                    if (sourceid) {
                        creep.memory["targetid"] = sourceid;
                        creep.memory["lvs"] = 100;
                        creep.memory["lvt"] = 100;
                    }
                }
                if (refs) {
                    creep.memory["sourceid"] = storageid;
                    creep.memory["lvs"] = -1;
                    delete creep.memory["enkinds"];
                }
            }
            return false;
        }
        if (lv <= 30)
            return false;
        if (dousernum >= 1 && dousernum * this.shipstore * 2 > neednum)
            return false;
        return true;
    }
    /**
     * 直接按本地位置来找
     * @param findroom
     */
    _getcreept(lockroom, role, st) {
        let ckind = this.botkind;
        let lv = role["lv"];
        let rolekey = role["rolekey"];
        let roomname = role["roomname"];
        role["enkind"];
        let findcreep = role["findcreep"];
        let creepfindtmp = Game.creeps[findcreep];
        if (!creepfindtmp) {
            delete role["findcreep"];
            findcreep = "";
        }
        else {
            if (creepfindtmp.memory["rolekey"] != rolekey) {
                delete role["findcreep"];
                findcreep = "";
            }
        }
        let roomdata = this.roomdatas.getRoomdata(lockroom);
        if (!roomdata)
            return;
        let roletargetid = role["roletargetid"];
        let sourceid = role["sourceid"];
        let source = this.getObjectById(sourceid);
        let roletarget = this.getObjectById(roletargetid);
        if (!roletarget) {
            this.AddLog("  _addplan  check douser1111  targeterr :" + roletargetid, 40, roletarget);
            return "";
        }
        let creeps = roomdata.getlocalcreeps(ckind);
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 26, creeps);
        if (!creeps)
            return "";
        let nearmax = 999;
        let nearnow;
        let findcreepold = role["findcreep"];
        let creepold = Game.creeps[findcreepold];
        if (!creepold || creepold.room.name != roomname)
            findcreepold = "";
        for (let cname in creeps) {
            let creep = Game.creeps[cname];
            if (!creep) {
                delete creeps[cname];
                delete this.roomdatas.creeps[this.classname][cname];
                this.AddLog("_getcreept delete :" + cname, 30, creeps);
                continue;
            }
            let lvst = creep.memory["lv" + st];
            if (!creep.memory["rolekey"] || creep.memory["rolekey"] == "backpower" || !lvst) {
                lvst = -1;
            }
            this.AddLog("  addplan  check douser creep lv:" + st + lv + " " + lvst + " " + creep.name, 27, creep.pos);
            if (lv <= lvst)
                continue; //目标在搞更高级的
            //只有本房间才判断最近的
            if (roomname != creep.room.name) {
                findcreep = creep.name;
                this.addlog("ship78addplan", " _getcreept not in room:" + lockroom + " " + findcreep, 20, role, roletargetid, findcreep);
                break;
            }
            //if (!this.iscanref(rolekey)) {
            //    if (!findcreepold)
            //        findcreep = creep.name
            //    break;
            //}  
            //如果在20格之内就不需要判断这些
            if (creepold) {
                if (creepold.pos.getRangeTo(roletarget) <= 20) {
                    this.addlog("ship78addplan", " _getcreept <=20:" + lockroom + " " + findcreep, 27, role, roletargetid, findcreep, rolekey);
                    return findcreepold;
                }
            }
            //满的判断T 空的判断S
            if (creep.store.getUsedCapacity() == 0 && source) {
                nearnow = creep.pos.getRangeTo(source);
            }
            else
                nearnow = creep.pos.getRangeTo(roletarget);
            if (nearnow < nearmax) {
                nearmax = nearnow;
                findcreep = creep.name;
                this.addlog("ship78addplan", " _getcreept nearnow < nearmax:"
                    + lockroom + " " + findcreep, 20, creep.pos, roletargetid, findcreep);
            }
        }
        return findcreep;
        // 
    }
    /**
     * 直接按本地位置来找
     * @param findroom
     */
    _getcreep(lockroom, role, st) {
        let ckind = this.botkind;
        let lv = role["lv"];
        //let id = role["id"]
        //let roletarget: any = this.getObjectById(id)
        //if (!roletarget) {
        //    this.AddLog("  _addplan  check douser1111  targeterr :" + id
        //        , 40, roletarget)
        //    return "";
        //}
        let roomname = role["roomname"];
        role["enkind"];
        let roletargetid = role["roletargetid"];
        let findcreep;
        let roomdata = this.roomdatas.getRoomdata(lockroom);
        if (!roomdata)
            return;
        let creeps = roomdata.getlocalcreeps(ckind);
        //let room78: BaseRoom = this.room78s[lockroom]
        //let creeps
        //if (room78)
        //    creeps = room78.getCreepsckind(ckind)
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 26, creeps);
        if (!creeps)
            return "";
        for (let cname in creeps) {
            let creep = Game.creeps[cname];
            if (!creep) {
                delete creeps[cname];
                delete this.roomdatas.creeps[this.classname][cname];
                continue;
            }
            let lvst = creep.memory["lv" + st];
            if (!creep.memory["rolekey"] || creep.memory["rolekey"] == "backpower" || !lvst) {
                lvst = -1;
            }
            this.AddLog("  addplan  check douser creep lv:" + st + lv + " " + lvst + " " + creep.name, 26, creep.memory);
            if (lv <= lvst)
                continue;
            //分S时 必须t为同房间或者t为-1
            if (st == "s") {
                let targetid = creep.memory["targetid"];
                if (targetid) {
                    let lvt = creep.memory["lvt"];
                    if (!lvt)
                        lvt = -1;
                    let tmptarget = this.getObjectById(targetid);
                    this.AddLog("  addplan  check douser creep lvt:" + lvt + " " + targetid + " trueflase :"
                        + (lvt && lvt > 0 && tmptarget && tmptarget.room.name != roomname), 26, tmptarget);
                    if (lvt && lvt > 0 && creep.memory["enkindt"] == "spawn")
                        continue;
                    if (lvt && lvt > 0
                        && tmptarget && tmptarget.room.name != roomname)
                        continue;
                }
            }
            this.AddLog("  addplan  check roletarget.room.name == creep.room.name:" + roomname
                + " " + creep.room.name, 10);
            //只有本房间才判断最近的
            if (roomname == creep.room.name) {
                //nearnow = creep.pos.getRangeTo(roletarget)
                //this.AddLog("  addplan  check douser creep nearnow:" + nearnow
                //    + " " + nearmax
                //    , 10, creep.pos)
                //if (nearnow < nearmax) {
                //    nearmax = nearnow
                findcreep = creep.name;
                //}
                this.addlog("ship78addplan", " _getcreep findcreep:" + findcreep, 20, creep, findcreep, roletargetid);
                break;
            }
            else {
                findcreep = creep.name;
                this.addlog("ship78addplan", " _getcreep findcreep2:" + findcreep, 20, creep, findcreep, roletargetid);
                break;
            }
        }
        return findcreep;
    }
    /**
     * 清理douser 计数本房间本任务的爬 顺便存下其它房间的爬 看能否替换
     * */
    _addplanCheckdouser(role, st, enkind, neednum, sourceid) {
        let repcreep; //有不在这个房间的 可以用这个房间的来替换
        let refnear = 0; //997隔壁  998 隔壁隔壁
        let localcreep = 0; //在本房间的 又在搞这个任务的计数 隔壁的都不算个数 可以替换
        let roomname = role["roomname"];
        let roletargetid = role["roletargetid"];
        let rolekey = role["rolekey"];
        //有可能没跑这个了
        //也有可能在跑的没在这个房间
        //看看有没有本房间的
        //清理dousers 找出一个可以替换的爬
        for (let douser in role["dousers"]) {
            let douseritem = role["dousers"][douser];
            let creeptmp = Game.creeps[douser];
            if (!creeptmp) {
                delete role["dousers"][douser];
                this.addlog("ship78addplan", " delete douser:" + douser, 20, role, rolekey, roletargetid, douser);
                continue;
            }
            this.AddLog("_addplanCheckdouser test:" + creeptmp.memory["rolekey"], 26, creeptmp);
            if (creeptmp && !creeptmp.memory["rolekey"]) {
                delete role["dousers"][douser];
                this.addlog("ship78addplan", " delete douser rolekey empty:" + douser, 20, role, rolekey, roletargetid, douser);
                this.AddLog("_addplanCheckdouser test del:" + creeptmp.memory["rolekey"], 26, role["dousers"]);
                continue;
            }
            repcreep = douser;
            if (st == "t") {
                if (enkind != "spawn") {
                    if (creeptmp.memory["targetid"] != roletargetid) {
                        delete role["dousers"][douser];
                        this.addlog("ship78addplan", " delete douser targetid!=id:" + douser
                            + " " + rolekey + " " + creeptmp.memory["targetid"], 20, role, rolekey, roletargetid, douser);
                        continue;
                    }
                }
                else {
                    if (creeptmp.memory["enkindt"] != "spawn") {
                        delete role["dousers"][douser];
                        this.addlog("ship78addplan", creeptmp.memory["enkindt"] + " delete douser enkindt!=spawn:" + douser, 20, role, rolekey, roletargetid, douser);
                        continue;
                    }
                }
            }
            else {
                if (creeptmp.memory["sourceid"] != roletargetid) {
                    delete role["dousers"][douser];
                    this.addlog("ship78addplan", " delete douser sourceid!=id:" + douser, 20, role, rolekey, roletargetid, douser);
                    continue;
                }
            }
            if (creeptmp.room.name == roomname) {
                localcreep++;
                douseritem["near"] = 0; //后面可以判断距离
            }
            else {
                //找一个可以替换的爬
                if (douseritem["near"] != 0 || douseritem["near"] > refnear) {
                    refnear = douseritem["near"];
                    repcreep = douser;
                }
            }
        }
        //找到的不在这个房间的爬 如果有本房间的可以换
        role["refnear"] = refnear;
        role["repcreep"] = repcreep;
        role["localcreep"] = localcreep; //本房间搞这个任务的爬个数
        this.addlog("ship78addplan", localcreep + " clear douser over:" + repcreep, 20, role, rolekey, roletargetid);
        return;
    }
    /**
      * 调度是否需要增加减少爬个数
      * */
    _addplandousernum(role, st, enkind, neednum, sourceid) {
        this.AddLog("  _addplandousernum init:", 27, role);
        let repcreep; //有不在这个房间的 可以用这个房间的来替换
        let refnear = 0; //997隔壁  996 隔壁隔壁
        let localcreep = 0; //在本房间的 又在搞这个的计数 隔壁的都不算个数 可以替换
        let roomname = role["roomname"];
        let id = role["rolekey"];
        let roletargetid = role["roletargetid"];
        //有可能没跑这个了
        //也有可能在跑的没在这个房间
        //看看有没有本房间的
        //清理dousers 找出一个可以替换的爬
        for (let douser in role["dousers"]) {
            let douseritem = role["dousers"][douser];
            let creeptmp = Game.creeps[douser];
            if (!creeptmp) {
                delete role["dousers"][douser];
                this.addlog("ship78addplan", " delete douser:" + douser, 20, role, id, roletargetid, douser);
                continue;
            }
            if (st == "t") {
                if (enkind != "spawn") {
                    if (creeptmp.memory["targetid"] != roletargetid) {
                        delete role["dousers"][douser];
                        this.addlog("ship78addplan", " delete douser targetid!=id 2:" + douser, 20, role, id, roletargetid, douser);
                        continue;
                    }
                }
                else {
                    if (creeptmp.memory["enkindt"] != "spawn") {
                        delete role["dousers"][douser];
                        this.addlog("ship78addplan", " delete douser enkindt!=spawn 2:" + douser, 20, role, id, roletargetid, douser);
                        continue;
                    }
                }
            }
            else {
                if (creeptmp.memory["sourceid"] != roletargetid) {
                    delete role["dousers"][douser];
                    this.addlog("ship78addplan", " delete douser sourceid!=id 2:" + douser, 20, role, id, roletargetid, douser);
                    continue;
                }
            }
            if (creeptmp.room.name == roomname) {
                localcreep++;
                douseritem["near"] = 0;
            }
            else {
                //找一个可以替换的爬
                if (douseritem["near"] != 0 || douseritem["near"] > refnear) {
                    refnear = douseritem["near"];
                    repcreep = douser;
                }
            }
        }
        //if (!Object.keys(role["dousers"])
        //    || Object.keys(role["dousers"]).length == 0) {
        //}
        this.AddLog("  addplan2 checknew ref info:"
            + enkind + (!Object.keys(role["dousers"])), 26, role["dousers"]);
        //根据本房间个数和能量总量和机器容量决定是否需要减
        let dousernum = Object.keys(role["dousers"]).length;
        this.addlog("ship78addplan", " _addplandousernum:" + dousernum, 10, role, id, roletargetid);
        this.AddLog("_addplandousernum test:"
            + (dousernum - 1) + " " + this.shipstore, 25);
        if ((dousernum - 1) * this.shipstore > neednum) {
            if (repcreep) {
                let creeptmp = Game.creeps[repcreep];
                this.addlog("ship78addplan", " _addplandousernum 减爬:" + repcreep, 20, creeptmp, repcreep, roletargetid);
                delete role["dousers"][repcreep];
                if (st == "s") {
                    delete creeptmp.memory["sourceid"];
                    delete creeptmp.memory["lvs"];
                    delete creeptmp.memory["enkinds"];
                }
                else {
                    delete creeptmp.memory["targetid"];
                    delete creeptmp.memory["lvt"];
                    delete creeptmp.memory["enkindt"];
                }
                repcreep = "";
            }
            return;
        }
        //容量决定是不是要加
        if (localcreep >= 1 && (localcreep + 1) * this.shipstore > neednum) {
            return;
        }
        //10回合计算一次 添加 或更改为本地
        //if (dousernum >= 1 && !this.refnum(this.memoryclass, this.classname)) {
        if (dousernum >= 1 && !this.iscanref(this.classname)) {
            return;
        }
        this.AddLog("  addplan2 test  localcreep num:" + localcreep + enkind, 27, role);
        //有些任务不必要支持1个的
        if (localcreep >= 1) {
            switch (enkind) {
                case "terminal": //t
                case "tower": //t
                case "spawn": //t
                case "linkstorage": //t
                case "storecreep": //t
                case "sourcenormal": //s可能是边缘
                    return;
            }
            if (sourceid)
                return;
        }
        //找到的不在这个房间的爬
        role["refnear"] = refnear;
        role["repcreep"] = repcreep;
        role["localcreep"] = localcreep;
        return true;
    }
}

/**
 * ����ģ��
 * ǰ��Ӹ�����ģ�� �ܵ����ȵ� �����˲������
 * ���ܣ�
 *
 * */
class Spawn78 extends Basic78 {
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Spawn78";
        this.logleaveAuto = 26; //26  
        super.init();
        //this.globalclass = global.mine9[this.classname]//����� 
        //����Ҫ��ǰ��
        if (props) {
            this.roomdatas = props.roomdatas;
            this.seting = props.seting;
        }
        if (!this.globalclass["createlist"])
            this.globalclass["createlist"] = {};
        this.createlist = this.globalclass["createlist"];
        this.shipstore = 200;
    }
    /**
     *  ����
     * */
    run() {
        this.createlist = this.getGlobalclass()["createlist"];
        this.addlog("run", "--run init ::", 26, this.createlist);
        //this.AddLog("run init2 :", 26, global.mine9[this.classname]);
        this._doCreatelist();
    }
    _doCreatelist() {
        for (let spawnname in Game.spawns) {
            let spawn = Game.spawns[spawnname];
            this.addlog("_doCreatelist", "--_doCreatelist:" + spawnname, 25, this.createlist, spawnname);
            if (spawn.spawning)
                continue;
            if (spawnname == "www778878net" && !Game.creeps["debug"]) {
                spawn.spawnCreep([TOUGH], "debug", {
                    "memory": {
                        //"rolekey": "", "sourceid": "", "targetid": ""
                        //, "creepname": "",
                        "debuglogkey": "~~"
                    }
                });
                continue;
            }
            let roomname = spawn.room.name;
            if (!this.seting.rooms[roomname])
                continue;
            let createlisttopkey = "";
            let createlisttoplv = -99;
            //ѭ�������ҵ����ȼ����
            //ֻ�ұ����� �򱾷��丽����(������ʱû����)
            for (let rolekey in this.createlist) {
                let createrole = this.createlist[rolekey];
                let ckind = createrole["mempar"]["memory"]["ckind"];
                let rolelv = createrole["lv"];
                this.addlog("_doCreatelist", "_doCreatelist rolelv:" + rolelv, 10, null, spawnname);
                if (rolelv <= createlisttoplv)
                    continue;
                let createroomname = createrole["mempar"]["memory"]["roleroom"];
                this.addlog("_doCreatelist", "_doCreatelist createroomname:" + createroomname + roomname, 10, createrole["mempar"], spawnname);
                //�����������ж��Ƿ��ڸ������� ����ֻ��������͸��ڷ����
                if (createroomname != roomname) {
                    let nexts = this.getNextRooms(createroomname);
                    this.addlog("_doCreatelist", "_doCreatelist nexts:" + createroomname + roomname, 10, nexts, spawnname);
                    let findnext = false;
                    for (var i = 0; i < nexts.length; i++) {
                        if (nexts[i] == roomname) {
                            if (ckind != "CClaim78") {
                                findnext = true;
                                break;
                            }
                            if (ckind == "CClaim78" && Game.rooms[nexts[i]].energyCapacityAvailable >= 650) {
                                findnext = true;
                                break;
                            }
                        }
                        //if (ckind != "CClaim78") {
                        let nextnext = this.getNextRooms(nexts[i]);
                        for (var i = 0; i < nextnext.length; i++) {
                            if (nextnext[i] == roomname) {
                                findnext = true;
                                break;
                            }
                        }
                        // }
                        if (findnext)
                            break;
                    }
                    if (!findnext)
                        continue;
                }
                createlisttopkey = rolekey;
                createlisttoplv = rolelv;
            }
            if (!createlisttopkey) {
                continue;
            }
            let createrole = this.createlist[createlisttopkey];
            //�ҵ���
            this.addlog("_doCreatelist", "_doCreatelist :" + createlisttopkey, 25, createrole, spawnname);
            this._dospawnCreep(spawn, createrole);
        }
        //����û��� �Ϳ����Ҹ��ڵĸ���
        //if (this.iscanref(this.classname)) {
        //    global.mine9["Spawn78"]["createlist"] = {}
        //}
    }
    /**
     * ִ������
     * */
    _dospawnCreep(spawn, createrole) {
        this.AddLog("_dospawnCreep init:", 20, createrole);
        if (!createrole)
            return;
        //�ȼ���BODY
        let body = this._getCreepBody(spawn, createrole);
        this.AddLog("_dospawnCreep body:", 20, body);
        if (body.length == 0)
            return;
        let bodycost = createrole["bodycost"];
        let room = spawn.room;
        this.AddLog("_dospawnCreep :" + bodycost + room.energyAvailable, 20, body);
        if (room.energyAvailable >= bodycost) {
            let creepname = this.getNewid();
            if (createrole["mempar"]["memory"]["creepname"])
                creepname = createrole["mempar"]["memory"]["creepname"];
            let tmp = spawn.spawnCreep(body, creepname, createrole["mempar"]);
            if (tmp == 0) {
                if (createrole["callback"]) {
                    createrole["callback"](createrole["rolekey"], creepname, createrole);
                    //this.AddLog("_dospawnCreep callback test :" + createrole["rolekey"], 80);
                }
                //this.roomdatas.creeps[rolekind][creepname] = { name: creepname, id: creep.id }
                //this.roomdatas.creeps[kind][creepname] = { name: creepname, id: creep.id }
            }
            else {
                this.AddLog("_dospawnCreep do :" + spawn.name + tmp, 50, createrole);
            }
            //if (createrole["callback"])
            //    createrole["callback"]["spawnover"](Game.creeps[creepname]);
            delete this.createlist[createrole["rolekey"]];
        }
    }
    /**
     * ���������Զ�����BODY
     * 300 550 800 1300
     * */
    _getCreepBody(spawn, createrole) {
        if (!createrole)
            return;
        //����������
        let room = spawn.room;
        let energyCapacityAvailable = room.energyCapacityAvailable;
        let ckind = createrole["mempar"]["memory"]["ckind"];
        let body = [];
        let cost = 0;
        let costone;
        let worknum = 0;
        let rolelv = createrole["lv"];
        switch (ckind) {
            case "CAttSimp":
                costone = 90;
                for (var i = 0; i < 10; i++) {
                    if (energyCapacityAvailable < costone)
                        break;
                    body.push(TOUGH, TOUGH, TOUGH, TOUGH, MOVE);
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                break;
            case "CDef78":
                body.push(TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE);
                cost = 10 * 6 + 50 * 3;
                energyCapacityAvailable -= cost;
                costone = 80 * 2 + 50;
                for (var i = 0; i < 3; i++) {
                    if (energyCapacityAvailable < costone)
                        break;
                    body.push(ATTACK, ATTACK, MOVE);
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                break;
            case "CClaim78":
                if (rolelv >= 100) {
                    body.push(CLAIM, MOVE);
                    cost = 650;
                }
                else {
                    costone = 650;
                    //body.push(CLAIM, MOVE);
                    //energyCapacityAvailable -= 650;
                    for (var i = 0; i < 5; i++) {
                        if (energyCapacityAvailable < costone)
                            break;
                        if (energyCapacityAvailable > costone && energyCapacityAvailable < costone * 2) {
                            for (var j = 0; j < 3; j++) {
                                body.push(MOVE);
                                energyCapacityAvailable -= 50;
                                cost += 50;
                                //this.AddLog(energyCapacityAvailable + "_getCreepBody :" + costone, 50, body);
                                if (energyCapacityAvailable <= costone)
                                    break;
                            }
                            //break;
                        }
                        body.push(CLAIM, MOVE);
                        energyCapacityAvailable -= costone;
                        cost += costone;
                    }
                }
                break;
            case "CWatch78":
                body.push(MOVE);
                cost = 50;
                break;
            case "CStore78":
                costone = 50;
                body.push(MOVE);
                energyCapacityAvailable -= 50;
                for (var i = 0; i < 20; i++) {
                    if (energyCapacityAvailable < costone)
                        break;
                    body.push(CARRY);
                    worknum += 1;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                createrole["mempar"]["memory"]["carrynum"] = worknum;
                break;
            case "CBuild78": //5�����ϼӸ��ֿ�
                costone = 250;
                body.push(CARRY);
                energyCapacityAvailable -= 50;
                cost += 50;
                for (var i = 0; i < 3; i++) {
                    if (worknum == 6 && energyCapacityAvailable >= 50) {
                        body.push(CARRY);
                        energyCapacityAvailable -= 50;
                        cost += 50;
                    }
                    if (energyCapacityAvailable < costone)
                        break;
                    body.push(WORK, WORK, MOVE);
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                createrole["mempar"]["memory"]["worknum"] = worknum;
                break;
            case "CUp78":
                costone = 250;
                body.push(CARRY);
                energyCapacityAvailable -= 50;
                cost += 50;
                let maxworknum = createrole["mempar"]["memory"]["maxworknum"];
                for (var i = 0; i < 3; i++) {
                    if (maxworknum < 2)
                        break;
                    if (energyCapacityAvailable < costone)
                        break;
                    body.push(WORK, WORK, MOVE);
                    maxworknum -= 2;
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                createrole["mempar"]["memory"]["worknum"] = worknum;
                break;
            case "CShip78":
            case "CShip782":
                costone = 150;
                if (!this.roomdatas.creeps[ckind]
                    || Object.keys(this.roomdatas.creeps[ckind]).length <= 1) {
                    if (room.energyAvailable >= costone * 2)
                        energyCapacityAvailable = room.energyAvailable;
                }
                if (rolelv >= 100)
                    energyCapacityAvailable = room.energyAvailable;
                for (var i = 0; i < 6; i++) {
                    if (energyCapacityAvailable < costone)
                        break;
                    body.push(CARRY, CARRY, MOVE);
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                if (worknum * 50 > this.shipstore)
                    this.shipstore = worknum * 50;
                createrole["mempar"]["memory"]["carrynum"] = worknum;
                break;
            case "COce78":
                costone = 250;
                //if (  !this.roomdatas.creeps[ckind]
                //    || Object.keys(this.roomdatas.creeps[ckind]).length <= 0) {
                //    if (room.energyAvailable >= costone)
                //        energyCapacityAvailable = room.energyAvailable
                //}         
                if (rolelv >= 100)
                    energyCapacityAvailable = room.energyAvailable;
                for (var i = 0; i < 3; i++) {
                    if (energyCapacityAvailable < costone) {
                        if (i == 1 && energyCapacityAvailable >= 100) {
                            body.push(WORK);
                            worknum += 1;
                            energyCapacityAvailable -= 100;
                            cost += 100;
                        }
                        break;
                    }
                    body.push(MOVE, WORK, WORK);
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                //this.AddLog("_getCreepBody COce78 test :" + rolelv, 40, body);
                //return;
                createrole["mempar"]["memory"]["worknum"] = worknum;
                break;
        }
        createrole["bodycost"] = cost;
        this.AddLog("_getCreepBody :", 10, body);
        return body;
    }
    delplan(rolekey) {
        delete this.getGlobalclass()["createlist"][rolekey];
    }
    /**
     * �����½��ƻ�
     * rolekey:Ψһ kind+�Ǹ�kind���Ƶ�Ψһ
     * mempar:���ú�д���ڴ�
     * */
    addplan(rolekey, lv, mempar, callback = null) {
        this.createlist = this.getGlobalclass()["createlist"];
        this.createlist[rolekey] = {
            rolekey: rolekey, lv: lv, mempar: mempar,
            callback: callback
        };
        // 
        this.AddLog("addplan:" + rolekey, 20, this.createlist[rolekey]);
    }
}

/**
 * 采矿功能模块
 * .采矿的最好坐仓库上
 * */
class Oce78 extends Basic78 {
    //------------------以下自动管理
    //sources: any//矿数据
    //creeps:any//矿爬数据
    //plans
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Oce78";
        super.init();
        this.logleaveAuto = 30; //25;  
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
            this.seting = props.seting;
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.ship78 = props.ship78;
        }
        this._init();
    }
    run() {
        this.AddLog("run init:", 15);
        this._autoPlan(); //计算  一个房间一个计划      
        this.AddLog("plans:", 15);
        this._doplan(); //是否安排生产
        //循环所有的控制器
        //for (let sourceid in this.sources) {
        //    //获取这个控制器周围可以站的点及当前有多少WORK了
        //    this._runGetinfo(sourceid)
        //    if (!this.sources[sourceid]) continue;
        //    //如果没到15个就可以安排
        //    this._runWorknum(sourceid)
        //}
        //this.AddLog("run over:", 25, this.sources);
        //this._run();
    }
    addcallback(rolekey, creepname, createrole) {
        let role = Memory["rolelist78"]["Oce78"]["plans"][rolekey];
        if (!role)
            return;
        if (!role["dousers"])
            role["dousers"] = {};
        delete role["douser"];
        let creep = Game.creeps[creepname];
        let worknum = creep.memory["worknum"];
        role["worknum"] += worknum;
        role["dousers"][creepname] = {
            creep: creep.name,
            worknum: worknum
        };
    }
    /**
     * false 有了 清除新建
     * */
    _doplan_going(rolekey) {
        let creeps = this.roomdatas.creeps[this.classname];
        let plans = this.memoryclass["plans"];
        let role = plans[rolekey];
        if (!role)
            return false;
        let worknum = role["worknum"];
        let dousers = role["dousers"];
        let roomname = role["roleroom"];
        if (!this.seting["outoce"][roomname]
            && !this.seting["rooms"][roomname]
            && !this.seting["catt"][roomname]) {
            delete plans[rolekey];
            return false; //有了还搞啥
        }
        if (!Game.rooms[roomname])
            return false; //有了还搞啥
        let worknumcheck = 0;
        for (let creepname in dousers) {
            if (!Game.creeps[creepname]) {
                worknum -= role["dousers"][creepname]["worknum"];
                delete role["dousers"][creepname];
                role["worknum"] = worknum;
                continue;
            }
            else {
                worknumcheck += role["dousers"][creepname]["worknum"];
            }
        }
        role["worknum"] = worknumcheck;
        if (worknum >= 6)
            return false; //有了还搞啥
        let createlvtmp = this.createlv;
        if (worknum >= 2)
            createlvtmp = createlvtmp - 50;
        if (this.seting["outoce"][roomname])
            createlvtmp = createlvtmp - 20;
        if (!creeps || Object.keys(creeps).length <= 1)
            createlvtmp += 100;
        let mem = {
            memory: {
                rolekind: this.classname,
                roleroom: roomname,
                rolekey: rolekey //唯一标记 
                ,
                ckind: this.botkind //有可能一种机型不同的任务的
                ,
                targetid: role["targetid"]
            }
        };
        this.AddLog("_runWorknum addplan:", 15, mem);
        //找到一个没有安排的位置 安排生产//
        this.spawn78.addplan(rolekey, createlvtmp, mem, this.addcallback);
        return true;
    }
    _doplan() {
        let plans = this.getMemoryclass()["plans"];
        for (let rolekey in plans) {
            if (!this.iscanref(rolekey)) {
                continue;
            }
            let add = this._doplan_going(rolekey);
            if (!add) {
                this.spawn78.delplan(rolekey);
            }
        }
    }
    /**
    * 这里只管添加计划
    * */
    _autoPlan() {
        for (let roomname in this.seting["rooms"]) {
            this._autoPlando(roomname);
        }
        for (let roomname in this.seting["outoce"]) {
            this._autoPlando(roomname);
        }
    }
    _autoPlando(roomname) {
        //if (!this.iscanref(roomname)) {
        //    return;
        //}
        let roomdata = this.roomdatas.getRoomdata(roomname);
        if (!roomdata || !roomdata.room)
            return;
        if (!this.getMemoryclass()["plans"])
            this.getMemoryclass()["plans"] = {};
        let plans = this.getMemoryclass()["plans"];
        this.addlog("_autoPlando", " _autoPlan1 ：" + roomname, 10, roomdata.sources, roomname);
        for (var i = 0; i < roomdata.sources.length; i++) {
            let rolekey = roomdata.sources[i].id + this.classname;
            if (!plans[rolekey]) {
                plans[rolekey] = {
                    "rolekey": rolekey,
                    roleroom: roomname,
                    targetid: roomdata.sources[i].id,
                    worknum: 0
                };
            }
            else
                plans[rolekey]["targetid"] = roomdata.sources[i].id;
            if (!plans[rolekey]["dousers"])
                plans[rolekey]["dousers"] = {};
        }
    }
    CreepRun(creep) {
        this.AddLog("  creeprun init :", 10);
        let plans = this.memoryclass["plans"];
        creep.memory["rolekind"];
        let rolekey = creep.memory["rolekey"];
        let roomname = creep.memory["roleroom"];
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test";
            this.AddLog("Creep   test in debug:" + this.logleave, 40, creep.pos);
        }
        this.AddLog("Creep   test  :" + rolekey, 10, plans[rolekey]);
        if (plans[rolekey] && creep.memory["targetid"] != plans[rolekey]["targetid"])
            creep.memory["targetid"] = plans[rolekey]["targetid"];
        let targetid = creep.memory["targetid"];
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        if (plans[rolekey] && !plans[rolekey]["dousers"][creep.name]) {
            let worknum = creep.memory["worknum"];
            let role = plans[rolekey];
            let roleworknum = role["worknum"];
            if (!role["dousers"][creep.name]) {
                role["dousers"][creep.name] = {
                    creep: creep.name,
                    worknum: worknum
                };
                role["worknum"] = roleworknum + worknum;
            }
        }
        let roomdata = this.roomdatas.getRoomdata(roomname);
        if (!roomdata || !roomdata.room) {
            creep.moveTo(new RoomPosition(10, 10, roomname));
            return;
        }
        //if (roomdata && roomdata.globalclass.creepsother && Object.keys(roomdata.globalclass.creepsother).length >= 1) {
        //    return
        //}
        this.AddLog("  creeprun targetid :" + targetid, 10);
        //如果附近有资源池 要站在池边
        let target = this.getObjectById(targetid);
        if (!target)
            return;
        //this.memoryclass[targetid] = creep.name
        if (creep.spawning)
            return;
        //this.refcreep(creep, 30)
        this.AddLog("  CreepRun roomdata  :" + roomname, 10, roomdata);
        //let x = creep.memory["rolex"]
        //let y = creep.memory["roley"]
        //let des = new RoomPosition(x, y, roomname)
        let rolestep = creep.memory["rolestep"];
        if (!rolestep) {
            if (!creep.pos.isNearTo(target)) {
                rolestep = "move";
            }
            else {
                rolestep = "working";
            }
        }
        if (rolestep == "move") {
            if (!creep.pos.isNearTo(target)) {
                creep.moveTo(target);
            }
            else {
                rolestep = "working";
            }
            return;
        }
        if (creep.pos.isNearTo(target)) {
            let tmp = creep.harvest(target);
            if (tmp == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            //if (source) {
            //if (kind == "ext") {
            //    if (source.store.getUsedCapacity() >= 100) {
            //        this.rcenter.roleship.addplan(source.id, "s"
            //            , "sourceext", source.store.getUsedCapacity(), kind, 0, 0, this._getstorage(roomname).id)
            //    }
            //} else {
            //    if (source.store.getUsedCapacity() >= 1000) {
            //        this.rcenter.roleship.addplan(source.id, "s"
            //            , "sourceoce", source.store.getUsedCapacity(), "energy")
            //    }
            //}  
            // }
            return;
        }
    }
    _init() {
        //把这个任务的爬和所有的矿拉过来
        if (!this.memoryclass["plans"])
            this.memoryclass["plans"] = {};
    }
}

/**
 * 如果一个SCREEP都没有了 它就启动 造一个爬去采矿并回来
 * */
class GameInit extends Basic78 {
    //----------------------------
    constructor(props) {
        super();
        this.classname = "GameInit";
        super.init();
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
        }
        this.logleave = 40;
        this._init();
        delete Memory["rolelist78"][this.classname];
    }
    run() {
        this.AddLog("run init:", 15);
        if (Game.creeps["GameInit"]) {
            //try {
            this._runinit();
            //} catch (e) {
            //    this.AddLog("err GameInit _runinit :", 90, e);
            //} 
            return;
        }
        if (!this.iscanref(this.classname)) {
            return;
        }
        if (Object.keys(Game.creeps).length >= 3) {
            return;
        }
        //好象有BUILD了不用这样判断了
        let havestore = false;
        for (let roomname in Game.rooms) {
            let roomdata = this.roomdatas.getRoomdata(roomname);
            if (!roomdata || !roomdata.spawnname)
                continue;
            this.AddLog("getstructByType init:", 15, roomdata.getstructByType(STRUCTURE_CONTAINER));
            if (roomdata.getstructByType(STRUCTURE_CONTAINER)) {
                havestore = true;
                break;
            }
        }
        this.AddLog("run test init:" + havestore + (havestore && Object.keys(Game.creeps).length >= 3), 50);
        if (havestore && Object.keys(Game.creeps).length >= 3) {
            //if (Object.keys(Game.creeps).length >= 3) {    
            return;
        }
        for (let index in Game.spawns) {
            let spawn = Game.spawns[index];
            let room = spawn.room;
            let energyAvailable = room.energyAvailable - 300;
            let body = [WORK, CARRY, CARRY, MOVE, MOVE];
            // body = [  CARRY, CARRY, MOVE, MOVE]
            for (var i = 0; i < 10; i++) {
                if (energyAvailable < 100)
                    break;
                if (energyAvailable >= 300) {
                    body.push(WORK, CARRY, CARRY, MOVE, MOVE);
                    energyAvailable -= 300;
                }
                else if (energyAvailable >= 100) {
                    body.push(CARRY, MOVE);
                    energyAvailable -= 100;
                }
                else if (energyAvailable >= 50) {
                    body.push(MOVE);
                    energyAvailable -= 50;
                }
            }
            let tmp = spawn.spawnCreep(body, 'GameInit');
            this.AddLog("创建 机器人 GameInit " + tmp, 50, body);
            return;
        }
    }
    _init() {
        //把这个任务的爬和所有的矿拉过来
        this.creeps = this.roomdatas.creeps[this.classname];
    }
    /**
     * 采矿 补SPAWN 修理 升级
     * */
    _runinit() {
        let creep = Game.creeps["GameInit"];
        let room = creep.room;
        let roomname = room.name;
        let roomdata = this.roomdatas.getRoomdata(roomname);
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        let targetid = creep.memory["targetid"];
        let rolekind = creep.memory["rolekind"];
        if (!rolekind) {
            rolekind = "oce";
        }
        this.AddLog("_runinit:" + rolekind, 10, roomdata);
        if (!targetid) {
            creep.memory["targetid"] = roomdata["sources"][0]["id"];
            return;
        }
        let target = this.getObjectById(targetid); //矿
        if (!target)
            return;
        if (rolekind == "upgrade") {
            if (creep.store.getUsedCapacity() == 0) {
                creep.memory["rolekind"] = "oce";
                return;
            }
            //没有建造工地了 就升级
            let source = this.getObjectById(room.controller.id);
            this.AddLog("CreepBuild build    role_target controller:" + creep.pos.inRangeTo(source, 3), 0);
            if (creep.pos.inRangeTo(source, 3)) {
                let tmp = creep.upgradeController(source);
                this.AddLog("CreepBuild        controller upgradeController:" + tmp, 0);
            }
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }
        if (rolekind == "build") {
            if (creep.store.getUsedCapacity() == 0) {
                creep.memory["rolekind"] = "oce";
                return;
            }
            let buildid = creep.memory["buildid"];
            if (!buildid) {
                for (let i in roomdata.globalclass.constructionsites) {
                    this.AddLog("_runinit build:" + i, 10, roomdata.globalclass.constructionsites);
                    creep.memory["buildid"] = roomdata.globalclass.constructionsites[i]["id"];
                    return;
                }
            }
            let build;
            try {
                build = this.getObjectById(buildid);
            }
            catch (e) {
                delete creep.memory["buildid"];
            }
            if (!build) {
                delete creep.memory["buildid"];
                creep.memory["rolekind"] = "upgrade";
                return;
            }
            this.AddLog("_runinit :build" + rolekind, 10, build.pos);
            if (creep.pos.isNearTo(build)) {
                creep.build(build);
                return;
            }
            creep.moveTo(build, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }
        if (rolekind == "fillspawn") {
            if (creep.store.getUsedCapacity() == 0) {
                creep.memory["rolekind"] = "oce";
                return;
            }
            if (room.energyAvailable == room.energyCapacityAvailable) {
                creep.memory["rolekind"] = "build";
                return;
            }
            this.AddLog("fillspawn:" + rolekind + roomdata.spawnname, 10);
            let sourceid = Game.spawns[roomdata.spawnname].id;
            if (!sourceid) {
                this.AddLog("_runinit sourceid:", 10, roomdata.globalclass["spawn"]);
                creep.memory["sourceid"] = Object.keys(roomdata.globalclass["spawn"])[0];
                return;
            }
            let source = this.getObjectById(sourceid);
            if (!source)
                return;
            if (creep.pos.isNearTo(source)) {
                creep.transfer(source, RESOURCE_ENERGY);
                return;
            }
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }
        if (rolekind == "getpower") {
            if (creep.store.getFreeCapacity() == 0) {
                creep.memory["rolekind"] = "fillspawn";
                return;
            }
            let targetid = creep.memory["sourceid"];
            let target = this.getObjectById(targetid);
            this.AddLog("getpower  target :", 10, target);
            if (!target || target["energy"] < 30) {
                delete creep.memory["sourceid"];
                creep.memory["rolekind"] = "oce";
                return;
            }
            if (creep.pos.isNearTo(target)) {
                let tmp = -1;
                if (target.store) {
                    this.AddLog("pickup test  arget.storo   :" + Object.keys(target.store), 10, target.store);
                    Object.keys(target.store).length;
                    for (var key in target.store) {
                        if (key == "energy")
                            continue;
                        let type = key;
                        tmp = creep.withdraw(target, type);
                        this.AddLog("pickup test  arget.storo   :" + tmp + key, 10, target.store[key]);
                        break;
                    }
                }
                if (tmp != 0)
                    tmp = creep.pickup(target);
                if (tmp != 0)
                    tmp = creep.withdraw(target, RESOURCE_ENERGY);
                this.AddLog("pickup pickup    :" + tmp, 20);
                return;
            }
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }
        this.AddLog("test: ", 20, roomdata);
        if (rolekind == "oce") {
            if (creep.store.getFreeCapacity() == 0) {
                creep.memory["rolekind"] = "fillspawn";
                return;
            }
            let sourceid = creep.memory["sourceid"];
            if (sourceid) {
                creep.memory["rolekind"] = "getpower";
                return;
            }
            let structs = room.find(FIND_DROPPED_RESOURCES);
            for (var i = 0; i < structs.length; i++) {
                let structtmp = structs[i];
                this.AddLog("pickup find :" + this.logleave, 20, structtmp);
                //"energy":486,"amount":486,"resourceType":"energy"
                let energy = structtmp["energy"];
                if (energy < 30)
                    continue;
                let id = structtmp.id;
                creep.memory["sourceid"] = id;
                creep.memory["rolekind"] = "getpower";
                return;
            }
            if (creep.pos.isNearTo(target)) {
                let tmp = creep.harvest(target);
                if (tmp == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }
    }
}

/**
 *
 * */
class Watch78 extends Basic78 {
    //------------------以下自动管理
    //plans: any;//待建造计划
    //creeps: any;//爬
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Watch78";
        this.logleaveAuto = 30; //20
        super.init();
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.seting = props.seting;
        }
        this._init();
    }
    _init() {
        if (!this.memoryclass["plans"])
            this.memoryclass["plans"] = {};
    }
    Run() {
        //if (!this.iscanref(this.classname)) return;
        this._autoPlan(); //计算  一个房间一个计划      
        this._doPlan(); //调配或安排生产
    }
    CreepRun(creep) {
        this.reflocal(creep);
        this.roomdatas.creeps[this.classname];
        let plans = this.memoryclass["plans"];
        creep.memory["rolekind"];
        let rolekey = creep.memory["rolekey"];
        let role = plans[rolekey];
        if (role) {
            role["douser"] = creep.name;
        }
        else {
            delete creep.memory["rolekey"];
        }
        let roomname = creep.memory["roleroom"];
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test";
            this.AddLog("Creep   test in debug:" + this.logleave, 40, creep.pos);
        }
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        if (creep.spawning)
            return;
        if (!roomname)
            roomname = creep.room.name;
        let roomdata = this.roomdatas.getRoomdata(roomname);
        this.AddLog("  creeprun init :" + roomname, 10, roomdata);
        if (roomdata) {
            this.moveMapNotOut(creep);
            //如果有2个以上的爬了可以删任务了
            if (this.iscanref(roomname)) {
                //if (roomdata.room && roomdata.room.controller) {
                //    //改签名
                //    //"id":"5bbcab1d9099fc012e632deb","room":{"name":"W34N12","energyAvailable":56,"energyCapacityAvailable":1300,"visual":{"roomName":"W34N12"}},"pos":{"x":19,"y":42,"roomName":"W34N12"},"ticksToDowngrade":40000,"level":4,"progress":119690,"progressTotal":405000,"safeModeAvailable":3,"sign":{"username":"Imu","text":"✌🏽✌🏽","time":34927627,"datetime":"2022-01-12T00:46:25.085Z"},"isPowerEnabled":false,"owner":{"username":"www778878net"},"my":true,"hits":0,"hitsMax":0,"structureType":"controller"}
                //}
                let creeps = roomdata.room.find(FIND_MY_CREEPS);
                //this.AddLog("  creeprun test :" + roomname + Object.keys(creeps).length, 10, creeps);
                if (Object.keys(creeps).length >= 3) {
                    delete plans[rolekey];
                    delete creep.memory["rolekey"];
                    //delete creep.memory["roleroom"]
                    creep.suicide();
                }
            }
            return;
        }
        if (!rolekey)
            return;
        let targetpos = creep.memory["targetpos"];
        this.AddLog("Creep   test in debug:" + roomname + targetpos, 20, targetpos);
        let des;
        if (targetpos) {
            des = new RoomPosition(targetpos.x, targetpos.y, targetpos.roomName);
        }
        else {
            des = new RoomPosition(8, 25, roomname);
        }
        //creep.moveTo(des)
        creep.moveTo(des);
        return;
    }
    /**
     * 没有douser的调配 没有调配的就生产
     * */
    _doPlan() {
        let plans = this.getMemoryclass()["plans"];
        for (let roomname in plans) {
            if (!this.iscanref(roomname)) {
                continue;
            }
            this.addlog("_doPlan", " check   :" + roomname, 15, this.seting["catt"]);
            if (!this.seting["rooms"][roomname] && !this.seting["outoce"][roomname]
                && !this.seting["catt"][roomname]) {
                delete plans[roomname];
                continue;
            }
            let role = plans[roomname];
            let douser = role["douser"];
            if (douser) {
                this.addlog("_doPlan", "dousr check   :" + roomname + douser, 15, null, roomname, douser);
                let creepdouser = Game.creeps[douser];
                if (creepdouser) {
                    //if (creepdouser.memory["rolekey"] == roomname) {
                    //    continue;
                    //}
                    this.addlog("_doPlan", "dousr check  set rolekey  :" + roomname + douser, 15, null, roomname, douser);
                    creepdouser.memory["rolekey"] = roomname;
                    continue;
                }
                delete role["douser"];
                douser = null;
            }
            //调度 找本房间和找NEXTROOM二层
            let findcreep = this._getcreep(roomname, role);
            let nexts = this.getNextRooms(roomname);
            if (!findcreep) {
                for (var i = 0; i < nexts.length; i++) {
                    findcreep = this._getcreep(nexts[i], role);
                    if (findcreep) {
                        break;
                    }
                }
            }
            if (!findcreep) {
                //再隔壁的隔壁  
                for (var i = 0; i < nexts.length; i++) {
                    let nexts2 = this.getNextRooms(nexts[i]);
                    for (var j = 0; j < nexts2.length; j++) {
                        findcreep = this._getcreep(nexts2[j], role);
                        if (findcreep) {
                            break;
                        }
                    }
                }
            }
            let rolekey = role["rolekey"];
            if (findcreep) {
                role["douser"] = findcreep;
                let creep = Game.creeps[findcreep];
                creep.memory["rolekey"] = rolekey;
                creep.memory["roleroom"] = role["roleroom"];
                continue;
            }
            //生产
            //没找到 请求新建  
            this.spawn78.addplan(rolekey + this.classname, this.createlv, {
                memory: {
                    rolekind: this.classname,
                    roleroom: roomname,
                    rolekey: rolekey //唯一标记
                    ,
                    ckind: this.botkind //有可能一种机型不同的任务的 
                }
            }, this.addcallback);
            this.AddLog("  addplan  check over not find reqlistadd:" + roomname, 10, role);
        }
    }
    addcallback(rolekeyspawn, creepname, createrole) {
        let rolekey = createrole["mempar"]["memory"]["rolekey"];
        let role = Memory["rolelist78"]["Watch78"]["plans"][rolekey];
        //console.log("watch addcallback "+rolekey + JSON.stringify(role))
        if (!role)
            return;
        role["douser"] = creepname;
    }
    /**
    * 直接按本地位置来找
    * @param findroom
    */
    _getcreep(lockroom, role) {
        let ckind = this.botkind;
        role["roomname"];
        let roomdata = this.roomdatas.getRoomdata(lockroom);
        if (!roomdata)
            return;
        let creeps = roomdata.globalclass["local"][ckind];
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 26, creeps);
        if (!creeps)
            return "";
        for (let cname in creeps) {
            let creep = Game.creeps[cname];
            if (!creep) {
                delete creeps[cname];
                continue;
            }
            if (!creep.memory["rolekey"])
                return cname;
        }
    }
    /**
     * 这里只管添加计划
     * */
    _autoPlan() {
        this.AddLog(" _autoPlan ：", 20, this.seting["outoce"]);
        for (let roomname in this.seting["rooms"]) {
            this._autoPlando(roomname);
        }
        for (let roomname in this.seting["outoce"]) {
            this._autoPlando(roomname);
        }
        this.addlog("_autoPlan", " check catt :", 15, this.seting["catt"]);
        for (let roomname in this.seting["catt"]) {
            this._autoPlando(roomname);
        }
        this.AddLog(" _autoPlan ：", 15, this.seting["outoce"]);
    }
    _autoPlando(roomname) {
        //if (!this.iscanref(roomname)) {
        //    return;
        //}
        let plans = this.getMemoryclass()["plans"];
        let roomdata = this.roomdatas.getRoomdata(roomname);
        this.AddLog(" _autoPlan1 ：" + roomname, 20, roomdata);
        if (roomdata) {
            if (plans[roomname])
                delete plans[roomname];
            return;
        }
        if (!plans[roomname]) {
            plans[roomname] = {
                "rolekey": roomname,
                roleroom: roomname
            };
        }
        this.addlog("_autoPlando", " check  roomname2 :" + roomname, 15, plans);
    }
}

/**
 * 升级
 * .加个设置 每个房间可以设置Worknum
 * */
class Up78 extends Basic78 {
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Up78";
        this.logleaveAuto = 40;
        super.init();
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.ship78 = props.ship78;
            this.warknummax = props.warknummax;
            this.seting = props.seting;
        }
        this._init();
    }
    run() {
        this.controlls = this.getMemoryclass()["controlls"];
        if (!this.controlls) {
            this._init();
        }
        this.creeps = this.roomdatas.creeps[this.classname];
        this.AddLog("run init:", 15);
        //循环所有的控制器
        for (let controllid in this.controlls) {
            //if (!this.iscanref(controllid)) {
            //    return;
            //}
            //获取这个控制器周围可以站的点及当前有多少WORK了
            this._runGetinfo(controllid);
            //如果没到15个就可以安排
            this._runWorknum(controllid);
        }
        this.AddLog("run over:", 30, this.controlls);
        //this._run();
    }
    /**
     * 如果没到15个就可以安排
     * */
    _runWorknum(controllid) {
        // this.controlls[controllid]["worknum"]
        let controll = this.getObjectById(controllid);
        if (!controll)
            return;
        let locals = this.controlls[controllid]["locals"];
        let worknum = 0; // this.controlls[controllid]["worknum"];
        this.AddLog("test 1_runWorknum:" + worknum, 20, locals);
        for (let key in locals) {
            key + this.classname;
            this.AddLog("test 2_runWorknum:" + key + locals[key]["douser"], 20, Game.creeps[locals[key]["douser"]]);
            if (locals[key]["douser"]) {
                if (!Game.creeps[locals[key]["douser"]]) {
                    delete locals[key]["douser"];
                    delete locals["worknum"];
                    continue;
                }
                worknum += locals[key]["worknum"];
                this.controlls[controllid]["worknum"] = worknum;
                this.AddLog("test 3_runWorknum:" + worknum, 20);
                continue;
            }
            //else {
            //    if (locals[key]["worknum"]) {
            //        worknum -= locals[key]["worknum"]
            //        this.controlls[controllid]["worknum"] = worknum
            //        delete locals["worknum"]
            //    } 
            //}
        }
        this.AddLog("test 5_runWorknum:" + worknum, 20, this.controlls[controllid]);
        if (worknum >= this.warknummax - 5)
            return;
        let createlvtmp = this.createlv;
        if (worknum >= 4)
            createlvtmp = createlvtmp - 40;
        if (worknum >= 9)
            createlvtmp = createlvtmp - 60;
        if (worknum <= 0)
            createlvtmp += 20;
        let maxworknum = this.warknummax - worknum;
        let roomname = this.controlls[controllid]["roomname"];
        //找到一个可以安排的位置
        for (let key in locals) {
            let rolekey = roomname + key + this.classname;
            if (locals[key]["no"])
                continue;
            let creeptmp = Game.creeps[rolekey];
            if (creeptmp) {
                locals[key]["douser"] = rolekey;
                locals[key]["worknum"] = creeptmp.memory["worknum"];
                //this.controlls[controllid]["worknum"] += creeptmp.memory["worknum"]
                continue;
            }
            //找到一个没有安排的位置 安排生产
            this.spawn78.addplan(rolekey, createlvtmp, {
                memory: {
                    rolekind: this.classname,
                    roleroom: controll.room.name,
                    sourceid: this.controlls[controllid]["sourceid"],
                    rolekey: rolekey //唯一标记
                    ,
                    rolex: locals[key]["x"],
                    roley: locals[key]["y"],
                    ckind: this.botkind //有可能一种机型不同的任务的
                    ,
                    targetid: controllid,
                    creepname: rolekey,
                    maxworknum: maxworknum
                }
            }, this.addcallback);
            return;
        }
    }
    addcallback(rolekey, creepname, createrole) {
        let targetid = createrole["mempar"]["memory"]["targetid"];
        let rolex = createrole["mempar"]["memory"]["rolex"];
        let roley = createrole["mempar"]["memory"]["roley"];
        let role = Memory["rolelist78"]["Up78"]["controlls"][targetid];
        if (!role)
            return;
        role["locals"][rolex + "_" + roley]["douser"] = creepname;
    }
    /**
     * 获取这个控制器周围可以站的点及当前有多少WORK了
     * */
    _runGetinfo(controllid) {
        //找可以站的地
        let locals = this.controlls[controllid]["locals"];
        if (!locals || Object.keys(locals).length >= 1)
            return;
        //必须在仓库边上 且在控制器3格内
        let controll = this.getObjectById(controllid);
        let roomname = this.controlls[controllid]["roomname"];
        let roomdata = this.roomdatas.getRoomdata(roomname);
        let sourceid = roomdata.linkupid || roomdata.storeupid;
        this.AddLog("_runGetinfo :" + sourceid, 15);
        let souce = this.getObjectById(sourceid);
        if (!souce) {
            this.AddLog("_runGetinfo err souce empty:" + sourceid, 20);
            return;
        }
        this.controlls[controllid]["sourceid"] = sourceid;
        for (var x = -1; x <= 1; x++) {
            for (var y = -1; y <= 1; y++) {
                let tmpx = souce.pos.x + x;
                let tmpy = souce.pos.y + y;
                let tmppos = new RoomPosition(tmpx, tmpy, roomname);
                if (!this._getPosCanMove(tmppos, false)) {
                    continue;
                }
                if (!controll.pos.inRangeTo(tmpx, tmpy, 2))
                    continue;
                let key = tmpx + "_" + tmpy;
                if (!locals[key])
                    locals[key] = {
                        x: tmpx, y: tmpy
                    };
            }
        }
    }
    _init() {
        //把这个任务的爬和所有的矿拉过来
        if (!this.memoryclass["controlls"])
            this.memoryclass["controlls"] = {};
        this.controlls = this.getMemoryclass()["controlls"];
        for (let roomname in this.seting.rooms) {
            let roomdata = this.roomdatas.getRoomdata(roomname);
            if (!roomdata || !roomdata.spawnname)
                continue;
            let id = roomdata.room.controller.id;
            if (!this.controlls[id])
                this.controlls[id] = {
                    id: id, roomname: roomname,
                    worknum: 0 //几个WORK
                    ,
                    locals: {} //几个可站地
                };
        }
    }
    CreepRun(creep) {
        this.AddLog("  creeprun init :", 10);
        creep.memory["rolekind"];
        let rolekey = creep.memory["rolekey"];
        let roomname = creep.memory["roleroom"];
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test";
            this.AddLog("Creep   test in debug:" + this.logleave, 40, creep.pos);
        }
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        if (creep.spawning)
            return;
        let isno = creep.memory["isno"];
        let controllid = creep.memory["targetid"];
        if (!this.controlls[controllid])
            this.controlls[controllid] = {};
        let locals = this.controlls[controllid]["locals"];
        let x = creep.memory["rolex"];
        let y = creep.memory["roley"];
        //修复DOUSER应该不用了 creepname=rolekey在role就修复了
        if (locals && locals[x + "_" + y] && !locals[x + "_" + y]["douser"]) {
            locals[x + "_" + y]["douser"] = creep.name;
            locals[x + "_" + y]["worknum"] = creep.memory["worknum"];
        }
        this.getObjectById(controllid);
        //this.AddLog("test   isno:" + isno, 50, locals );
        if (isno && locals[x + "_" + y]) {
            locals[x + "_" + y]["no"] = 1;
        }
        let des = new RoomPosition(x, y, roomname);
        let rolestep = creep.memory["rolestep"];
        if (!rolestep) {
            if (!creep.pos.isEqualTo(des)) {
                rolestep = "move";
            }
            else {
                rolestep = "working";
            }
        }
        if (rolestep == "move") {
            if (!creep.pos.isEqualTo(des)) {
                creep.moveTo(des);
            }
            else {
                rolestep = "working";
            }
            return;
        }
        let roomdata = this.roomdatas.getRoomdata(roomname);
        if (rolestep == "working") {
            let sourceid = creep.memory["sourceid"];
            if (creep.store.getUsedCapacity() == 0) {
                //if (!sourceid && room78.linkup) {
                //    sourceid = room78.linkup
                //    creep.memory["sourceid"] = sourceid
                //}
                if (!sourceid) {
                    let containers = roomdata.globalclass["container"];
                    for (let tmpid in containers) {
                        let con = containers[tmpid];
                        let conid = con["id"];
                        if (creep.pos.isNearTo(con)) {
                            sourceid = conid;
                            creep.memory["sourceid"] = sourceid;
                            break;
                        }
                    }
                }
                if (!sourceid) {
                    //没有靠近的资源池
                    this.AddLog("build sourceid not fould  :" + rolekey + " ", 50);
                    return;
                }
                let source = this.getObjectById(sourceid);
                if (source && source["store"].getUsedCapacity(RESOURCE_ENERGY) <= 100) {
                    this.AddLog("build source  :" + sourceid + source["store"].getUsedCapacity(RESOURCE_ENERGY), 15, source);
                    if (source["store"].getFreeCapacity() >= 1000) { //仓库才大于1000
                        //this.rcenter.cautoship2.addplan(source.id, "t", "storeup", source["store"].getFreeCapacity(), "energy")
                        //this.rcenter.roleship.addplan(source.id, "t"
                        //    , "storeup", source["store"].getFreeCapacity(), "energy")
                        this.ship78.addplan(sourceid, "t", "storeup", source.store.getFreeCapacity(RESOURCE_ENERGY), "energy");
                    }
                    return;
                }
                creep.withdraw(source, RESOURCE_ENERGY);
                return;
            }
            let source = this.getObjectById(sourceid);
            if (source && source["store"].getFreeCapacity() >= 800) ;
            //修仓库
            if (source && source["hits"] < source["hitsMax"] * 0.9) {
                creep.repair(source);
                return;
            }
            //找一个最近的工地
            if (!creep.memory["buildover"]) {
                let buildtarget = null;
                let length = roomdata.globalclass.constructionsites.length;
                let buildid = creep.memory["buildid"];
                if (buildid)
                    buildtarget = this.getObjectById(buildid);
                if (!buildtarget) {
                    delete creep.memory["buildid"];
                    for (var i = 0; i < length; i++) {
                        // this.AddLog("collectstatic  check :" + state + " " + creep.pos.isNearTo(this.constructionsites[i].pos), 0);
                        if (creep.pos.inRangeTo(roomdata.globalclass.constructionsites[i].pos, 3)) {
                            buildtarget = roomdata.globalclass.constructionsites[i];
                            creep.memory["buildid"] = buildtarget.id;
                            this.AddLog("build8 build    role_target pos change:", 20, roomdata.globalclass.constructionsites[i].pos);
                            break;
                        }
                    }
                }
                if (buildtarget) {
                    creep.build(buildtarget);
                    //this.AddLog("rcollectstatic build    role_target:" + tmp + " ", 15);
                    return;
                }
                else {
                    creep.memory["buildover"] = true;
                }
            }
            let contral = this.getObjectById(roomdata.room.controller.id);
            this.AddLog("CreepBuild build    role_target controller:", 0);
            if (creep.pos.inRangeTo(contral, 3)) {
                let tmp = creep.upgradeController(contral);
                this.AddLog("CreepBuild        controller upgradeController:"
                    + tmp + " " + contral.progress, 20);
            }
            this.AddLog("collectbuild    25:", 15, creep.store);
            return;
        }
    }
}

/**
 *

 * */
class Claim78 extends Basic78 {
    //------------------以下自动管理
    //plans: any;//待建造计划
    //creeps: any;//爬
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Claim78";
        this.logleaveAuto = 40; //27 
        super.init();
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.seting = props.seting;
            if (props.myownname)
                this.myownname = props.myownname;
        }
        this._init();
    }
    _init() {
        if (!this.memoryclass["plans"])
            this.memoryclass["plans"] = {};
    }
    Run() {
        //return
        let plans = this.memoryclass["plans"];
        //if (!this.iscanref(this.classname)) return;
        this.AddLog("runinit:" + this.logleave, 10);
        this._autoPlan(); //计算  一个房间一个计划      
        this.AddLog("plans:", 27, plans);
        this._doplan(); //是否安排生产
    }
    CreepRun(creep) {
        this.reflocal(creep);
        this.roomdatas.creeps[this.classname];
        let plans = this.memoryclass["plans"];
        creep.memory["rolekind"];
        let rolekey = creep.memory["rolekey"];
        let roomname = creep.memory["roleroom"];
        let role = plans[rolekey];
        if (role) {
            if (role["douser"] != creep.name) {
                delete creep.memory["rolekey"];
                return;
            }
        }
        else {
            delete creep.memory["rolekey"];
            //creep.moveTo(new RoomPosition(0, 41, "W35N8"))
            //creep.moveTo(new RoomPosition(10, 6, "W7S47"))
            //creep.claimController(Game.getObjectById("5bbcac849099fc012e63599a"))
            //return;
            //creep.memory["rolekey"]=""
            //delete creep.memory["rolekey"]
            return;
        }
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test";
            this.AddLog("Creep   test in debug:" + this.logleave, 40, creep.pos);
        }
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        this.AddLog("  creeprun init :", 10, creep.memory);
        if (creep.spawning)
            return;
        let rolestep = creep.memory["rolestep"];
        if (!rolestep) {
            rolestep = "move";
            creep.memory["rolestep"] = rolestep;
        }
        //creep.memory["targetid"] = role["targetid"]
        let targetid = creep.memory["targetid"];
        let target;
        if (rolestep == "move") {
            if (!targetid) {
                if (!Game.rooms[roomname]) {
                    let des = new RoomPosition(20, 20, roomname);
                    //creep.moveTo(des)
                    creep.moveTo(des);
                    this.AddLog("  creeprun roomname empty   :" + roomname, 40);
                    return;
                }
                targetid = role["targetid"];
                creep.memory["targetid"] = targetid;
            }
            target = this.getObjectById(targetid);
            this.AddLog("  creeprun move to  target   :"
                + roomname, 20, target);
            if (creep.pos.isNearTo(target)) {
                rolestep = "working";
                creep.memory["rolestep"] = rolestep;
            }
            else {
                if (!target) {
                    let des = new RoomPosition(20, 20, roomname);
                    //creep.moveTo(des)
                    creep.moveTo(des);
                    return;
                }
                //this.moveto78(creep, target.pos, 1, creep.pos)
                creep.moveTo(target, { reusePath: 15 });
                return;
            }
            //return;
        }
        target = this.getObjectById(targetid);
        if (rolestep == "working") {
            this.AddLog("  creeprun in  working  :" + rolestep + " ", 10, target);
            if (!creep.pos.isNearTo(target)) {
                creep.memory["rolestep"] = "move";
                delete creep.memory["state"];
                return;
            }
            let isclaimatt = plans[roomname]["roletype"];
            let tmp;
            if (isclaimatt == "claim") {
                tmp = creep.claimController(target);
                this.AddLog("  creeprun in  working333  :" + rolestep + " ", 20, target);
                if (target["owner"]["username"] == this.myownname) {
                    delete creep.memory["rolekey"];
                    delete creep.memory["rolestep"];
                    delete creep.memory["targetid"];
                }
            }
            else {
                if (target["reservation"]
                    && target["reservation"]["username"] != this.myownname) {
                    tmp = creep.attackController(target);
                    this.AddLog(target["reservation"]["username"] + "  creeprun in  working att ok :"
                        + this.myownname + tmp + " ", 20, target["reservation"]);
                }
                else {
                    tmp = creep.reserveController(target);
                    this.AddLog("  creeprun in  working ok :"
                        + isclaimatt + tmp + " ", 20);
                }
            }
        }
    }
    _doplan() {
        let plans = this.memoryclass["plans"];
        for (let roomname in plans) {
            if (!this.iscanref(roomname))
                continue;
            let role = plans[roomname];
            //!this.seting["rooms"][roomname] &&
            if (!this.seting["outoce"][roomname]
                && !this.seting["catt"][roomname]) {
                delete plans[roomname];
                continue; //有了还搞啥
            }
            let roomdata = this.roomdatas.getRoomdata(roomname);
            if (!roomdata || !roomdata.room || !roomdata.room.controller)
                continue;
            this.AddLog("_doplan:" + roomname + this.myownname, 27, roomdata.room.controller);
            if (roomdata.room.controller.owner
                && roomdata.room.controller.owner["username"] == this.myownname) {
                if (plans[roomname])
                    delete plans[roomname];
                continue; //有了还搞啥
            }
            let douser = role["douser"];
            if (douser) {
                let creepdouser = Game.creeps[douser];
                if (creepdouser) {
                    if (creepdouser.memory["targetid"] != role["targetid"]) {
                        creepdouser.memory["rolekey"] = roomname;
                        creepdouser.memory["roleroom"] = role["roleroom"];
                        creepdouser.memory["roletype"] = role["roletype"];
                        creepdouser.memory["targetid"] = role["targetid"];
                    }
                    continue;
                }
                delete role["douser"];
                douser = null;
            }
            //调度 找本房间和找NEXTROOM二层
            let findcreep = this._getcreep(roomname, role);
            let nexts = this.getNextRooms(roomname);
            if (!findcreep) {
                for (var i = 0; i < nexts.length; i++) {
                    findcreep = this._getcreep(nexts[i], role);
                    if (findcreep) {
                        break;
                    }
                }
            }
            if (!findcreep) {
                //再隔壁的隔壁  
                for (var i = 0; i < nexts.length; i++) {
                    let nexts2 = this.getNextRooms(nexts[i]);
                    for (var j = 0; j < nexts2.length; j++) {
                        findcreep = this._getcreep(nexts2[j], role);
                        if (findcreep) {
                            break;
                        }
                    }
                }
            }
            this.AddLog("addplan  find next nextroom findcreep:" + findcreep + roomname, 27);
            let rolekey = role["rolekey"];
            if (findcreep) {
                role["douser"] = findcreep;
                let creep = Game.creeps[findcreep];
                creep.memory["rolekey"] = rolekey;
                creep.memory["roleroom"] = role["roleroom"];
                creep.memory["roletype"] = role["roletype"];
                creep.memory["targetid"] = role["targetid"];
                //delete role["douser"]
                continue;
            }
            let roletype = role["roletype"];
            let createlv = this.createlv;
            if (roletype == "claim")
                createlv = 100;
            //生产
            //没找到 请求新建  
            this.spawn78.addplan(rolekey + this.classname, createlv, {
                memory: {
                    rolekind: this.classname,
                    roleroom: roomname,
                    rolekey: rolekey //唯一标记
                    ,
                    ckind: this.botkind //有可能一种机型不同的任务的
                    ,
                    "roletype": role["roletype"]
                }
            }, this.addcallback);
            this.AddLog("  addplan  check over not find reqlistadd:" + roomname, 27, role);
        }
    }
    addcallback(rolekeyspawn, creepname, createrole) {
        let rolekey = createrole["mempar"]["memory"]["rolekey"];
        let role = Memory["rolelist78"]["Claim78"]["plans"][rolekey];
        console.log("Claim78 addcallback " + rolekey + JSON.stringify(role));
        if (!role)
            return;
        role["douser"] = creepname;
    }
    /**
 * 直接按本地位置来找
 * @param findroom
 */
    _getcreep(lockroom, role) {
        let ckind = this.botkind;
        role["roomname"];
        let roomdata = this.roomdatas.getRoomdata(lockroom);
        if (!roomdata)
            return;
        if (!roomdata.globalclass["local"])
            roomdata.globalclass["local"] = {};
        let creeps = roomdata.globalclass["local"][ckind];
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 25, creeps);
        if (!creeps)
            return "";
        for (let cname in creeps) {
            let creep = Game.creeps[cname];
            if (!creep) {
                delete creeps[cname];
                continue;
            }
            if (!creep.memory["rolekey"])
                return cname;
        }
    }
    /**
     * 这里只管添加计划
     * */
    _autoPlan() {
        //if (!this.iscanref(this.classname)) return;
        let plans = this.getMemoryclass()["plans"];
        this.AddLog(" _autoPlan ：", 26, this.seting["outoce"]);
        for (let roomname in this.seting["catt"]) {
            this.addlog("_autoPlan", " check2   :" + roomname, 15, this.seting["catt"]);
            if (!this.iscanref(roomname))
                continue;
            let roomdata = this.roomdatas.getRoomdata(roomname);
            this.addlog("_autoPlan", " check   :" + roomname, 15, roomdata);
            if (!roomdata || !roomdata.room)
                continue;
            if (!roomdata.room.controller) {
                this.AddLog(" check role err controller empty: " + this.classname + roomname, 40);
                continue;
            }
            if (roomdata.room && roomdata.room.controller) {
                //是别人的了还搞毛线
                if (roomdata.room.controller.owner)
                    continue;
            }
            this.addlog("_autoPlan", " check3   :" + roomname, 15, roomdata);
            if (!roomdata.room || !roomdata.room.controller || !roomdata.room.controller.id)
                continue;
            this.addlog("_autoPlan", " check4   :" + roomname, 15, roomdata);
            if (!plans[roomname]) {
                this.getMemoryclass()["plans"][roomname] = {
                    "rolekey": roomname,
                    roleroom: roomname,
                    targetid: roomdata.room.controller.id
                };
                this.AddLog(" check role add: " + this.classname + roomname, 26, plans);
            }
            plans[roomname]["roletype"] = "claim";
            this.addlog("_autoPlan", " check5   :" + roomname, 15, this.getMemoryclass()["plans"][roomname]);
        }
        for (let roomname in this.seting["outoce"]) {
            if (!this.iscanref(roomname))
                continue;
            let roomdata = this.roomdatas.getRoomdata(roomname);
            this.AddLog(" _autoPlan11 ：" + roomname, 27, roomdata);
            if (!roomdata || !roomdata.room)
                continue;
            let ticksToEnd = 0;
            if (!roomdata.room.controller) {
                this.AddLog(" check role err controller empty: " + this.classname + roomname + ticksToEnd, 40);
                continue;
            }
            this.AddLog(" check1 ：" + roomname, 27, roomdata.room.controller);
            let username = this.myownname;
            this.AddLog(" check2 ：" + roomname + this.classname, 15, plans);
            if (roomdata.room && roomdata.room.controller) {
                if (roomdata.room.controller.reservation) {
                    ticksToEnd = roomdata.room.controller.reservation.ticksToEnd;
                    username = roomdata.room.controller.reservation.username;
                }
                //是别人的了还搞毛线
                if (roomdata.room.controller.owner)
                    continue;
            }
            this.AddLog(" rolelist check " + username + ticksToEnd, 26, plans);
            //大于1200秒不搞了
            if (!plans[roomname]
                && username == this.myownname && ticksToEnd > 1200)
                continue;
            this.AddLog(" check role: " + this.classname + roomname + ticksToEnd, 26);
            if (!roomdata.room || !roomdata.room.controller || !roomdata.room.controller.id)
                continue;
            if (!plans[roomname]) {
                plans[roomname] = {
                    "rolekey": roomname,
                    roleroom: roomname,
                    targetid: roomdata.room.controller.id
                };
                this.AddLog(" check role add: " + this.classname + roomname + ticksToEnd, 26, plans);
            }
            plans[roomname]["roletype"] = "up";
        }
        //for (let roomname in this.seting["rooms"]) {
        //    this.AddLog(" _autoPlan2 ：" + roomname, 10)
        //    if (!this.iscanref(roomname)) continue;
        //    let roomdata = this.roomdatas.getRoomdata(roomname)
        //    this.AddLog(" _autoPlan1 ：" + roomname, 10, roomdata.room.controller)
        //    if (!roomdata || !roomdata.room || !roomdata.room.controller) continue;
        //    if (roomdata.room && roomdata.room.controller && roomdata.room.controller.owner
        //        && roomdata.room.controller.owner["username"] == this.myownname) {
        //        if (plans[roomname])
        //            delete plans[roomname];
        //        continue;//有了还搞啥
        //    }
        //    if (!plans[roomname]) {
        //        plans[roomname] = {
        //            "rolekey": roomname,
        //            roleroom: roomname
        //            , targetid: roomdata.room.controller.id
        //        };
        //    }
        //    plans[roomname]["roletype"] = "claim"
        //}
    }
}

/**
 * 简易防御类

 * */
class Def78 extends Basic78 {
    //------------------以下自动管理
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Def78";
        super.init();
        this.logleaveAuto = 20; //20
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.seting = props.seting;
        }
        this._init();
    }
    run() {
        //T攻击
        for (let roomname in this.seting["rooms"]) {
            this._attdef(roomname);
            //this._addplan(roomname)
        }
        for (let roomname in this.seting["outoce"]) {
            this._addplan(roomname);
        }
        //doplan 
        let plans = this.memoryclass["plans"];
        for (let roomname in plans) {
            this._doplan(roomname);
        }
    }
    CreepRun(creep) {
        this.AddLog("CreepRun in :", 15, creep.pos);
        this.reflocal(creep);
        let rolekey = creep.memory["rolekey"];
        let plans = this.memoryclass["plans"];
        if (plans[rolekey] && !plans[rolekey]["dousers"][creep.name]) {
            let role = plans[rolekey];
            if (!role["dousers"][creep.name]) {
                role["dousers"][creep.name] = {
                    creep: creep.name
                };
            }
        }
        creep.memory["rolekind"];
        let roomname = creep.memory["roleroom"];
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test";
        }
        //this.AddLog("Creep   test in debug:"
        //    + creep.memory["local"] + this.classname, 26, global.mine9[creep.memory["local"]]["localCShip78"]);
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        if (creep.spawning)
            return;
        let room78 = this.roomdatas.getRoomdata(roomname);
        let targetid = creep.memory["targetid"];
        this.AddLog("  creeprun move to  get room  targetid 333 :" + targetid, 10);
        if (!targetid && room78) {
            if (room78.globalclass.creepsother && Object.keys(room78.globalclass.creepsother).length >= 1) {
                targetid = room78.globalclass.creepsother[0].id;
                creep.memory["targetid"] = targetid;
                this.AddLog(" check creepsother ：" + targetid, 20, room78.globalclass.creepsother[0]);
            }
            if (room78.globalclass.invaderCorefind
                && Object.keys(room78.globalclass.invaderCorefind).length > 0) {
                targetid = room78.globalclass.invaderCorefind[0].id;
                creep.memory["targetid"] = targetid;
            }
        }
        let target = this.getObjectById(targetid);
        this.AddLog("  creeprun move to  get room  targetid :" + targetid, 10, target);
        if (target) {
            creep.memory["targetpos"] = target.pos;
            let tmp;
            if (creep.pos.isNearTo(target)) {
                tmp = creep.attack(target);
                this.AddLog("  creepatt att   :" + tmp, 10, target);
            }
            else {
                if (creep.room.name != target.room.name)
                    creep.moveTo(target);
                else {
                    //多个目标打最近的
                    if (room78.globalclass.creepsother && Object.keys(room78.globalclass.creepsother).length >= 1) {
                        let nearmax = 999;
                        for (var i = 0; i < Object.keys(room78.globalclass.creepsother).length; i++) {
                            let creepid = room78.globalclass.creepsother[0].id;
                            let creepnext = this.getObjectById(creepid);
                            let nearnow = creep.pos.getRangeTo(creepnext["pos"]);
                            if (nearnow < nearmax) {
                                target = creepnext;
                            }
                        }
                    }
                    this.moveMapNotOut(creep);
                    tmp = creep.moveTo(target);
                }
                //   creep.moveTo(target)
                this.AddLog("  creepatt move to   :" + tmp, 10, target);
            }
            return;
        }
        if (!room78) {
            let targetpos = creep.memory["targetpos"];
            let des;
            if (targetpos) {
                des = new RoomPosition(targetpos.x, targetpos.y, targetpos.roomName);
            }
            else {
                des = new RoomPosition(8, 25, roomname);
            }
            //creep.moveTo(des)
            creep.moveTo(des);
            return;
        }
        else {
            if (targetid && !target) {
                this.AddLog("  creeprun clear rolekey   targetid :" + targetid, 40, target);
                delete creep.memory["targetid"];
                delete creep.memory["rolekey"];
                return;
            }
        }
    }
    _doplan(roomname) {
        if (!this.iscanref(roomname)) {
            return;
        }
        let plans = this.memoryclass["plans"];
        let role = plans[roomname];
        let dousers = role["dousers"];
        if (dousers && Object.keys(dousers).length >= 1)
            return;
        let rolekey = role["rolekey"];
        let mem = {
            memory: {
                rolekind: this.classname,
                roleroom: roomname,
                rolekey: rolekey //唯一标记 
                ,
                ckind: this.botkind //有可能一种机型不同的任务的
            }
        };
        this.AddLog("_runWorknum addplan:", 15, mem);
        //找到一个没有安排的位置 安排生产
        this.spawn78.addplan(rolekey + this.classname, this.createlv, mem, this.addcallback);
    }
    addcallback(rolekeyspawn, creepname, createrole) {
        let rolekey = createrole["mempar"]["memory"]["rolekey"];
        let role = Memory["rolelist78"]["Def78"]["plans"][rolekey];
        if (!role)
            return;
        if (!role["dousers"])
            role["dousers"] = {};
        role["dousers"][creepname] = {
            creep: creepname
        };
    }
    _addplan(roomname) {
        let plans = this.memoryclass["plans"];
        let roomdata = this.roomdatas.getRoomdata(roomname);
        if (!roomdata)
            return;
        if (this.iscanref(roomname)) {
            roomdata.globalclass.creepsother = roomdata.room.find(FIND_HOSTILE_CREEPS); //其它爬
            roomdata.globalclass.invaderCorefind = roomdata.room.find(FIND_STRUCTURES, {
                filter: { structureType: STRUCTURE_INVADER_CORE }
            });
        }
        if ((roomdata.globalclass.creepsother
            && Object.keys(roomdata.globalclass.creepsother).length > 0)
            || (roomdata.globalclass.invaderCorefind
                && Object.keys(roomdata.globalclass.invaderCorefind).length > 0)) {
            if (!plans[roomname]) {
                plans[roomname] = {
                    "rolekey": roomname,
                    roleroom: roomname,
                    kind: "creep",
                    dousers: {}
                };
            }
            return;
        }
        delete this.memoryclass["plans"][roomname];
    }
    _attdef(roomname) {
        let roomdata = this.roomdatas.getRoomdata(roomname);
        if (!roomdata)
            return;
        if (this.iscanref(roomname)) {
            roomdata.globalclass.creepsother = roomdata.room.find(FIND_HOSTILE_CREEPS); //其它爬
        }
        this.AddLog("test att :", 10, roomdata.globalclass.creepsother);
        if (roomdata.globalclass.creepsother && Object.keys(roomdata.globalclass.creepsother).length >= 1) {
            let atts = roomdata.globalclass.creepsother;
            let towers = roomdata.globalclass[STRUCTURE_TOWER];
            this.AddLog("test att  towers:", 10, towers);
            if (atts && Object.keys(atts).length >= 1) {
                for (let attid in atts) {
                    for (let towerid in towers) {
                        let tid = towerid;
                        let towertmp = this.getObjectById(tid);
                        towertmp["attack"](atts[attid]);
                    }
                    break;
                }
            }
        }
    }
    _init() {
        if (!this.memoryclass["plans"])
            this.memoryclass["plans"] = {};
    }
}

/**
 *

 * */
class Build78 extends Basic78 {
    //------------------以下自动管理
    //plans: any;//待建造计划
    //creeps: any;//爬
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Build78";
        super.init();
        this.logleaveAuto = 40;
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.ship78 = props.ship78;
            this.walldefault = props.walldefault;
            this.seting = props.seting;
            this.store78 = props.store78;
            this.wall = props.wall;
        }
        this._init();
    }
    _init() {
        if (!this.memoryclass["plans"])
            this.memoryclass["plans"] = {};
    }
    Run() {
        let plans = this.memoryclass["plans"];
        //每个房间一个就好 修 造 最后没事干了就去补墙
        this.AddLog("runinit:", 15);
        this._autoPlan(); //计算  一个房间一个计划      
        this.addlog("Run", "plans:", 15, plans);
        this._create(); //是否安排生产
    }
    CreepRun(creep) {
        this.reflocal(creep);
        this.roomdatas.creeps[this.classname];
        let plans = this.getMemoryclass()["plans"];
        creep.memory["rolekind"];
        let rolekey = creep.memory["rolekey"];
        let roomname = rolekey;
        let roomdata = this.roomdatas.getRoomdata(roomname);
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        this.AddLog("  creeprun init :", 10);
        if (creep.spawning)
            return;
        if (!rolekey) {
            //如果有任务 重新安排任务
            //if (plans[roomname])
            //    creep.memory["rolekey"] = plans[roomname]["rolekey"]
            //else {
            //    //没有 安排一个刷墙
            //    rolekey = roomname + "_wait"
            //}
            //this.AddLog("  creeprun rolekey empty :", 10, plans);
            return;
        }
        let role = plans[roomname];
        if (!role) {
            delete creep.memory["rolekey"];
            this.addlog("CreepRun", "  creeprun role not fould   :" + rolekey, 40, plans);
            //return;
        }
        if (!role["douser"]) {
            delete creep.memory["rolekey"];
            this.addlog("CreepRun", role["douser"] + " role douser empty   " + roomname + " " + creep.name, 40, role, creep.name, roomname + this.classname);
            return;
        }
        if (role["douser"] != creep.name) {
            this.addlog("CreepRun", roomname + "  douser != creep.name delrolekey "
                + role["douser"] + " " + creep.name + " " + creep.memory["rolekey"], 40, null, creep.name, roomname + this.classname);
            delete creep.memory["rolekey"];
            return;
        }
        //先把仓库的信息刷新
        let sourceid = creep.memory["sourceid"];
        let storecreep = Game.creeps[sourceid];
        this.AddLog("  creeprun in  test storecreep :" + roomname + sourceid + " " + creep.name, 10, storecreep);
        if (storecreep) {
            //有可能会抢 还是它自己决定好一点
            let storesourceid = storecreep.memory["sourceid"];
            let storesource = Game.creeps[storesourceid];
            this.AddLog("  creeprun in  test storecreep :" + roomname +
                storesourceid + " " + creep.name, 10, storecreep);
            if (storesource) { //如果有 又不是我就删除了 
                if (storesourceid != creep.name) {
                    delete creep.memory["sourceid"];
                    storesource = null;
                }
            }
            else {
                let creeplock = storecreep.memory["lockcreep"];
                if (creeplock) {
                    if (!Game.creeps[creeplock]) {
                        storecreep.memory["lockcreep"] = creep.name;
                    }
                }
                else
                    storecreep.memory["lockcreep"] = creep.name;
                if (!creep.pos.inRangeTo(storecreep.pos, 3)) {
                    this.ship78.addplan(creep.id, "t", "storecreep", creep.store.getFreeCapacity(RESOURCE_ENERGY), "energy");
                    this.AddLog(" fill store22   :", 20, this.ship78.memoryclass[roomname]["t"]);
                }
            }
        }
        let targetid = creep.memory["targetid"];
        if (!targetid) {
            if (role && role["targetid"]) {
                creep.memory["targetid"] = role["targetid"];
            }
            else { //没有 安排下个任务或一个刷墙
                this._CreeprunGetNextTarget(creep);
                creep.memory["rolestep"] = "move";
            }
            targetid = creep.memory["targetid"];
        }
        let target = this.getObjectById(targetid);
        this.AddLog("  creeprun check target :" + " " + targetid, 10);
        if (!target) {
            if (creep.room.name != roomname) {
                if (!roomdata)
                    return;
                this.addlog("_CreeprunGetNextTarget", "  creeprun move roomname  :"
                    + roomname + " " + targetid, 10, roomdata, creep.name, roomname);
                creep.moveTo(roomdata.room.controller);
                return;
            }
            this.addlog("creeprun", "targetid empty", 10, creep.pos, creep.name, roomname + this.classname);
            this._CreeprunGetNextTarget(creep);
            if (!creep.memory["targetid"]) {
                delete creep.memory["rolekey"];
                this.addlog("creeprun", "targetid empty over", 10, creep.pos, creep.name, roomname + this.classname);
            }
            return;
        }
        let rolestep = creep.memory["rolestep"];
        if (!rolestep)
            rolestep = "move";
        if (!creep.pos.inRangeTo(target, 3)) {
            rolestep = "move";
            creep.memory["rolestep"] = "move";
            //return;
        }
        if (!storecreep) {
            //要求补
            if (creep.store.getUsedCapacity() < creep.store.getFreeCapacity()) {
                this.ship78.addplan(creep.id, "t", "storecreep", creep.store.getFreeCapacity(RESOURCE_ENERGY), "energy");
                this.AddLog(" fill store   :", 20, this.ship78.memoryclass[roomname]["t"]);
            }
            sourceid = this.store78.addplan(creep.name, roomname, this.classname, 60);
            creep.memory["sourceid"] = sourceid;
        }
        else {
            delete this.ship78.memoryclass[roomname]["t"][creep.id + "Ship78"];
        }
        if (rolestep == "move") {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                if (storecreep
                    && storecreep.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
                    creep.transfer(storecreep, RESOURCE_ENERGY);
                }
                else {
                    creep.drop(RESOURCE_ENERGY);
                }
                //return;
            }
            creep.moveTo(target);
            if (creep.pos.inRangeTo(target, 3)) {
                creep.memory["rolestep"] = "working";
                return;
            }
            return;
        }
        //if (!creep.pos.inRangeTo(target, 3)) {
        //    creep.memory["rolestep"] = "move"
        //    return;
        //}
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
            if (storecreep && storecreep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                storecreep.transfer(creep, RESOURCE_ENERGY);
            }
            return;
        }
        if (target["structureType"] == "road") {
            if (storecreep && storecreep.fatigue == 0
                && creep.pos.isNearTo(storecreep)
                && !creep.pos.isEqualTo(target))
                creep.moveTo(target);
        }
        if (!target["hits"]) {
            let tmp = creep.build(target);
            if (target["structureType"] == "rampart")
                creep.memory["roletype"] = "rampart";
            else
                creep.memory["roletype"] = "build";
            if (tmp == -9)
                creep.memory["rolestep"] = "move";
            this.AddLog("CreepRepair  build:" + tmp + " " + creep.id, 10, target);
            return;
        }
        if (target["hits"] >= target["hitsMax"]) {
            delete creep.memory["targetid"];
            delete plans[roomname][targetid];
            this.AddLog("CreepRepair  over:" + creep.id, 0);
            return;
        }
        if (target["structureType"] == "rampart"
            || target["structureType"] == "constructedWall") {
            let setmaxhits = this.wall[roomname] || this.walldefault;
            this.AddLog("CreepRepair  repair :" + target["hits"] + " " + setmaxhits, 10);
            if (target["hits"] >= setmaxhits) {
                delete creep.memory["targetid"];
                delete plans[roomname][targetid];
                this.AddLog("CreepRepair rampart  over:" + target["structureType"] + creep.id + JSON.stringify(creep), 10);
                return;
            }
        }
        if (target["hits"] < target["hitsMax"]) {
            let tmp = creep.repair(target);
            this.AddLog("repair doing:" + tmp + target["hits"] + " " + target["hitsMax"], 0);
            return;
        }
    }
    /**
     * 安排下个任务或一个刷墙
     * */
    _CreeprunGetNextTarget(creep) {
        this.roomdatas.creeps[this.classname];
        let plans = this.memoryclass["plans"];
        let roomname = creep.memory["roleroom"];
        let targetid = "";
        let roomdata = this.roomdatas.getRoomdata(roomname);
        let roletype = creep.memory["roletype"];
        delete creep.memory["targetid"];
        this.addlog("_CreeprunGetNextTarget", "  creeprun check roletype :" + roletype + " " + targetid, 10, roomdata, creep.name, roomname);
        if (roletype == "rampart") { //这个必须要用find 找出最小的那个
            //找周边的rampart 这里没法用缓存
            let raps = creep.room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_RAMPART } });
            // creep.room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_RAMPART } })
            for (var key in raps) {
                if (raps[key] && raps[key]["hits"] <= 9999) {
                    creep.memory["targetid"] = raps[key].id;
                    this.AddLog("CreepRepair  find  rampart fix it:", 50, raps[key]);
                    return;
                }
                this.AddLog("CreepRepair  find  rampart:", 10, raps[key]);
            }
            delete creep.memory["roletype"];
            return;
        }
        //先把优先级>=20的处理完 然后才找近的
        let lv20over = creep.memory["lv20over" + roomname];
        if (!lv20over) {
            let lv = -1;
            let nearmax = 999;
            //找lv最高的
            let roles = plans[roomname];
            for (let id in roles) {
                let newid = id;
                let role = roles[id];
                let newobj = this.getObjectById(newid);
                if (!newobj) {
                    delete roles[id];
                    continue;
                }
                //if (!newobj.my) continue
                let nowlv = role["lv"];
                let nearnow = creep.pos.getRangeTo(newobj);
                if (nowlv <= 20)
                    continue;
                if (nearnow > 3 && newobj.hits && newobj.hits >= newobj.hitsMax * 0.9)
                    continue;
                this.addlog("_CreeprunGetNextTarget", "CreepRepair  lv >20 test:" + nowlv + " " + lv
                    + " nearnow:" + nearnow + " " + nearmax, 10, newobj.pos, creep.name, roomname);
                if (nowlv > lv) {
                    targetid = id;
                    lv = nowlv;
                    nearmax = nearnow;
                    this.addlog("_CreeprunGetNextTarget", "CreepRepair  lv >20:", 10, newobj.pos, creep.name, roomname);
                }
                else if (nowlv == lv) {
                    if (nearnow < nearmax) {
                        nearmax = nearnow;
                        targetid = id;
                        this.addlog("_CreeprunGetNextTarget", "CreepRepair change  lv >20:", 10, newobj.pos, creep.name, roomname);
                    }
                }
            }
            this.addlog("_CreeprunGetNextTarget", "  creeprun check find lv20 over :" + roletype + " " + targetid, 10, null, creep.name, roomname);
            if (targetid) {
                creep.memory["targetid"] = targetid;
            }
            else {
                creep.memory["lv20over" + roomname] = true;
            }
            return;
        }
        //现在就是找最近的了
        let nearmax = 999;
        let roles = plans[roomname];
        this.addlog("_CreeprunGetNextTarget", "CreepRepair change  lv findnear test  roles:", 10, roles, creep.name, roomname);
        for (let id in roles) {
            let newid = id;
            let newobj = this.getObjectById(newid);
            if (!newobj) {
                delete roles[id];
                continue;
            }
            //if (!newobj.my) continue
            if (newobj["structureType"] == "rampart"
                || newobj["structureType"] == "constructedWall") {
                let setmaxhits = this.wall[roomname] || this.walldefault;
                if (newobj.hits >= setmaxhits)
                    continue;
            }
            let nearnow = creep.pos.getRangeTo(newobj);
            this.AddLog("CreepRepair change  lv findnear test :" + nearnow
                + " " + newobj.hits + " " + newobj.hitsMax * 0.7
                + newobj["structureType"], 10, newobj.pos);
            if (newobj.hits && newobj.hits >= newobj.hitsMax * 0.9)
                continue;
            if (!targetid) {
                targetid = newid;
                //target = newobj
            }
            if (nearnow > 3 && newobj.hits && newobj.hits >= newobj.hitsMax * 0.7)
                continue;
            //路只修周边三格的
            if (nearnow > 3 && newobj["structureType"] == "road"
                && newobj.hits >= newobj.hitsMax * 0.7)
                continue;
            if (nearnow < nearmax) {
                nearmax = nearnow;
                targetid = id;
                //target = newobj
                creep.memory["targetid"] = targetid;
                this.AddLog("CreepRepair change  lv findnear:" + nearnow, 10, newobj.pos);
                if (nearmax <= 3)
                    break;
            }
        }
        if (!targetid) {
            let nextname;
            let roomnext = this.roomdatas.getNextRooms(roomname);
            for (var i = 0; i < roomnext.length; i++) {
                nextname = roomnext[i];
                let nextroles = plans[nextname];
                if (nextroles && Object.keys(nextroles).length >= 1) {
                    creep.memory["roleroom"] = nextname;
                    this.AddLog("CreepRepair  over changeroomnext  " + roomname + nextname, 20, nextroles);
                    return;
                }
            }
            this.AddLog("CreepRepair  over changeroomnext  " + roomname + nextname, 20, creep.pos);
            return;
        }
    }
    _create() {
        let creeps = this.roomdatas.creeps[this.classname];
        let plans = this.getMemoryclass()["plans"];
        for (let roomname in plans) {
            if (!this.iscanref(roomname)) {
                continue;
            }
            let plan = plans[roomname];
            let rolekey = roomname;
            let douser = plan["douser"];
            this.addlog("_create", plan["toplv"] + " start " + roomname + douser, 10, plan, roomname, roomname + this.classname);
            if (!Game.rooms[roomname]) {
                delete plans[roomname];
                continue;
            }
            if (douser) {
                let creepdouser = Game.creeps[douser];
                if (creepdouser) {
                    if (creepdouser.memory["rolekey"] == rolekey)
                        continue;
                    if (!creepdouser.memory["rolekey"]) {
                        this.addlog("_create", roomname + " douser check rolekey !=creepmemory set rolekey" + rolekey
                            + " " + creepdouser.memory["rolekey"] + " " + plan["douser"], 40, plan, roomname, douser, roomname + this.classname);
                        creepdouser.memory["rolekey"] = roomname;
                        creepdouser.memory["roleroom"] = roomname;
                        continue;
                    }
                    this.addlog("_create", " douser check rolekey !=creepmemory " + rolekey
                        + " " + creepdouser.memory["rolekey"] + " " + plan["douser"], 40, null, douser, roomname + this.classname);
                    delete plan["douser"];
                    continue;
                }
                this.addlog("_create delete douser", " douser check del " + rolekey
                    + " " + plan["douser"], 40, null, douser, roomname + this.classname);
                delete plan["douser"];
                //delete Game.creeps[douser].memory["rolekey"]
                continue;
            }
            if (!plan["toplv"] || plan["toplv"] < 20)
                continue;
            this.addlog("_create", roomname + " toplv check " + plan["toplv"], 10, null, roomname + this.classname, roomname);
            //看本房间或隔壁房间有没有
            //调度 找本房间和找NEXTROOM二层
            let findcreep = this._getcreepByRoomname(roomname);
            this.addlog("_create", plan["toplv"] + roomname + plan["douser"] + " findcreep1    " + findcreep, 10, roomname + this.classname, findcreep);
            let nexts = this.getNextRooms(roomname);
            if (!findcreep) {
                for (var i = 0; i < nexts.length; i++) {
                    findcreep = this._getcreepByRoomname(nexts[i]);
                    if (findcreep) {
                        break;
                    }
                }
            }
            this.addlog("_create", roomname + plan["douser"] + " findcreep next    " + findcreep, 10, roomname + this.classname, findcreep);
            if (findcreep) {
                plan["douser"] = findcreep;
                let creepok = Game.creeps[findcreep];
                creepok.memory["rolekey"] = roomname;
                creepok.memory["roleroom"] = roomname;
                delete creepok.memory["targetid"];
                this.addlog("_create", roomname + plan["douser"] + " findcreepok    " + findcreep, 40, null, roomname + this.classname, findcreep);
                continue;
            }
            this.addlog("_create", (Game.creeps[douser]) + " douser check " + roomname + douser, 10, null, roomname + this.classname, findcreep);
            //continue
            //搞多了资源供不上
            if (creeps && Object.keys(creeps).length >= 5) {
                if (!this.seting["rooms"][roomname]) {
                    continue;
                }
            }
            let mem = {
                memory: {
                    rolekind: this.classname,
                    roleroom: roomname,
                    rolekey: rolekey //唯一标记 
                    ,
                    ckind: this.botkind //有可能一种机型不同的任务的
                    ,
                    targetid: plans[roomname]["topid"]
                }
            };
            this.AddLog("_runWorknum create:" + rolekey, 10, mem);
            //找到一个没有安排的位置 安排生产
            let createlvtmp = this.createlv;
            if (this.seting["outoce"][roomname])
                createlvtmp = createlvtmp - 30;
            this.spawn78.addplan(rolekey + this.classname, createlvtmp, mem, this.addcallback);
        }
    }
    /**
   * 直接按本地位置来找
   * @param findroom
   */
    _getcreepByRoomname(lockroom) {
        let ckind = this.botkind;
        let roomdata = this.roomdatas.getRoomdata(lockroom);
        if (!roomdata)
            return "";
        if (!roomdata.globalclass["local"])
            roomdata.globalclass["local"] = {};
        let creeps = roomdata.globalclass["local"][ckind];
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 10, creeps);
        if (!creeps)
            return null;
        for (let cname in creeps) {
            let creep = Game.creeps[cname];
            if (!creep) {
                delete creeps[cname];
                continue;
            }
            if (!creep.memory["rolekey"])
                return cname;
        }
    }
    addcallback(rolekeyspawn, creepname, createrole) {
        let rolekey = createrole["mempar"]["memory"]["rolekey"];
        let role = Memory["rolelist78"]["Build78"]["plans"][rolekey];
        console.log("addcallback " + rolekey + " " + JSON.stringify(role));
        if (!role)
            return;
        role["douser"] = creepname;
    }
    /**
     * 返回False不用修 删除掉
     * */
    _autoPlan_going(structtmp, roomname) {
        let thistoplv;
        let id;
        let plans = this.getMemoryclass()["plans"];
        let roomrole = plans[roomname];
        if (!structtmp) {
            return false;
        }
        let roomdata = this.roomdatas.getRoomdata(roomname);
        let structureType = structtmp.structureType;
        id = structtmp.id;
        let hismax;
        let toplv = -1;
        switch (structureType) {
            case "rampart":
            case "constructedWall":
                if (!roomdata.spawnname)
                    return false;
                if (structtmp.pos.x == 0 || structtmp.pos.y == 0
                    || structtmp.pos.x == 49 || structtmp.pos.y == 49)
                    return false;
                hismax = this.wall[roomname] || this.walldefault;
                if (structtmp.hits > hismax * 0.7)
                    return false;
                thistoplv = 10;
                if (toplv < thistoplv) {
                    toplv = thistoplv;
                    structtmp.id;
                }
                //if (toplv == thistoplv && structtmp.hits > hitsnow) continue;
                this.AddLog("  _autopalan     :" + roomname + roomdata.spawnname, 0, structtmp.pos);
                break;
            case "storage":
            case "tower":
            case "container":
            case "link":
            case "extension":
            case "spawn":
            case "extractor":
            case "lab":
            case "terminal":
                if (structtmp.hits == structtmp.hitsMax)
                    return false;
                if (structtmp.hits >= structtmp.hitsMax * 0.9)
                    return false;
                if (structtmp.hits <= structtmp.hitsMax * 0.3)
                    thistoplv = 70;
                else
                    thistoplv = 10;
                hismax = structtmp.hitsMax;
                if (toplv < thistoplv) {
                    toplv = thistoplv;
                    structtmp.id;
                }
                this.AddLog("  _autopalan     :" + roomname, 0, structtmp);
                break;
            case "road":
                hismax = structtmp.hitsMax;
                //if (structtmp.hits == structtmp.hitsMax) continue;
                if (structtmp.hits >= structtmp.hitsMax * 0.9)
                    return false;
                //有>=20的就起动 检查的时候>20的才单独 就正好
                if (structtmp.hits <= structtmp.hitsMax * 0.6)
                    thistoplv = 20;
                else
                    thistoplv = 10;
                if (toplv < thistoplv) {
                    toplv = thistoplv;
                    structtmp.id;
                }
                this.AddLog("  _autopalan     :" + roomname, 0, structtmp);
                break;
            case "invaderCore":
            case "controller":
            case "keeperLair":
                return false;
            default:
                this.AddLog("repair find other kind :" + structureType, 40, structtmp);
                return false;
        }
        if (!roomrole[id]) {
            roomrole[id] = {
                id: id, kind: "repair",
                resourceType: structureType,
                hits: structtmp.hits,
                hitsmax: hismax,
                roomname: roomname,
                lv: thistoplv,
                pos: structtmp.pos
            };
        }
        else {
            roomrole[id]["hits"] = structtmp.hits;
            roomrole[id]["pos"] = structtmp.pos;
        }
        return true;
    }
    /**
     * 添加任务
     * */
    _autoPlan() {
        this.roomdatas.creeps[this.classname];
        let plans = this.getMemoryclass()["plans"];
        for (let roomname in Game.rooms) {
            let room = Game.rooms[roomname];
            if (!room)
                continue;
            if (room.controller && room.controller.owner && !room.controller.my) {
                delete plans[roomname];
                continue;
            }
            if (!this.iscanref(roomname)) {
                continue;
            }
            if (!plans[roomname])
                plans[roomname] = {};
            let roomdata = this.roomdatas.getRoomdata(roomname);
            let structures = roomdata.globalclass.structures;
            let roomrole = plans[roomname];
            //看要不要修
            if (structures) {
                for (var i = 0; i < structures.length; i++) {
                    let structtmp = structures[i];
                    let isneed = this._autoPlan_going(structtmp, roomname);
                    if (!isneed)
                        delete roomrole[structtmp.id];
                }
            }
            let toplv = roomrole["toplv"];
            let topid = roomrole["topid"];
            if (!toplv)
                toplv = -1;
            //工地建筑
            let length = roomdata.globalclass.constructionsites.length;
            for (var i = 0; i < length; i++) {
                let construct = roomdata.globalclass.constructionsites[i];
                let structureType = construct["structureType"];
                if (!construct.my)
                    continue;
                this.AddLog("build find :" + structureType, 0, construct);
                let id = construct.id;
                let thistoplv = -1;
                switch (structureType) {
                    case "storage":
                    case "spawn":
                    case "container":
                        thistoplv = 70;
                        break;
                    case "tower":
                        thistoplv = 60;
                        break;
                    case "extension":
                        thistoplv = 50;
                        break;
                    case "road":
                        thistoplv = 20;
                        break;
                    case "rampart":
                        thistoplv = 20;
                        break;
                    default:
                        thistoplv = 20;
                        break;
                }
                if (toplv < thistoplv) {
                    toplv = thistoplv;
                    topid = construct.id;
                }
                if (!roomrole[id]) {
                    roomrole[id] = {
                        id: id, kind: "build",
                        resourceType: structureType,
                        hits: 0,
                        hitsmax: 3000,
                        roomname: roomname,
                        lv: thistoplv
                    };
                }
            }
            plans[roomname]["toplv"] = toplv;
            plans[roomname]["topid"] = topid;
            this.addlog("_autoPlan", plans[roomname]["toplv"] + " over " + roomname +
                plans[roomname]["douser"], 10, plans[roomname], roomname, roomname + this.classname);
        }
    }
}

/**
 *

 * */
class Store78 extends Basic78 {
    //----------------------------
    constructor(props) {
        super();
        this.classname = "Store78";
        this.logleaveAuto = 40;
        super.init();
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas;
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.ship78 = props.ship78;
        }
        this._init();
    }
    _init() {
        this.creeps = this.roomdatas.creeps[this.classname];
        if (!this.globalclass["plans"])
            this.globalclass["plans"] = {};
        this.plans = this.globalclass["plans"];
    }
    //run() {
    //    //每个房间一个就好 修 造 最后没事干了就去补墙
    //    this.setDebug();
    //    this.AddLog("runinit:", 15);
    //}
    /**
    * 可以搞别的事儿 但是不能离开房间 除非lockcreep挂了就解放了
    * @param lookcreep
    * @param lockroom
    * @param lockrolekind
    */
    addplan(lockcreepname, lockroom, lockrolekind, locklv) {
        /**修理先请求一个Store 返回空闲store名字
        * 或者生产 (生产为了不同防冲突就targetid + "store"???)
       //找到了Store才生产修理机 生产时把store名字带过去了 sourceid

       //store逻辑:
       .如果lookcreep没有 或没生产出来
       .有rokekey先搞其它的不影响 以后MOVE也可以这样
       。如果没有rolekey 先走到lockroom 等lookcreep出来 就可以变过来了
       */
        let creeprole = {
            "ckind": this.botkind,
            rolekind: this.classname,
            "locklv": locklv,
            lockroom: lockroom,
            roleroom: lockroom,
            lockrolekind: lockrolekind,
            lockcreep: lockcreepname
            //, rolekey: targetid + "store"
            // 新建的 名字还是要搞个好找的 前面的名字是根据目标来的 加个store
        };
        //爬自己去判断如果lockc生产出来有了 就删除改到sid 然后再挂了就清了
        this.AddLog("    addplan:" + this.logleave + lockroom + lockcreepname, 10, creeprole);
        let findcreep = this._addplanfindcreep(lockroom, lockcreepname);
        if (findcreep) { //清除并更换lockinfo
            let creep = Game.creeps[findcreep];
            delete creep.memory["lockcreep"];
            for (let item in creeprole) {
                creep.memory[item] = creeprole[item];
            }
            return findcreep;
        }
        creeprole["rolekey"] = lockcreepname + "store";
        let mem = {
            memory: creeprole
        };
        //找到一个没有安排的位置 安排生产
        this.spawn78.addplan(creeprole["rolekey"], this.createlv, mem, this.addcallback);
        this.AddLog("create creep addplan:" + creeprole["rolekey"], 15, this.spawn78.createlist);
        return creeprole["rolekey"];
    }
    addcallback(rolekey, creepname, createrole) {
        let lockcreep = createrole["lockcreep"];
        if (Game.creeps[lockcreep])
            Game.creeps[creepname].memory["sourceid"] = lockcreep;
        //let role = Memory["rolelist78"]["Store78"]["plans"][rolekey]
        //if (!role) return
        //role["douser"] = creepname
    }
    /**
     * 在房间或隔壁二层找
     * */
    _addplanfindcreep(lockroom, lockcreepname) {
        let findcreep;
        //先看本房间有没有即可 再看roomname同的 再看隔壁的  后面再检查任务等级比当前低的
        findcreep = this._addplanFindCreepRoom(lockroom, lockcreepname);
        let nexts = this.getNextRooms(lockroom);
        if (!nexts)
            return;
        if (!findcreep) {
            for (var i = 0; i < nexts.length; i++) {
                findcreep = this._addplanFindCreepRoom(nexts[i], lockcreepname);
                if (findcreep)
                    break;
            }
        }
        if (!findcreep) {
            //再隔壁的隔壁
            for (var i = 0; i < nexts.length; i++) {
                let nexts2 = this.getNextRooms(nexts[i]);
                for (var j = 0; j < nexts2.length; j++) {
                    findcreep = this._addplanFindCreepRoom(nexts2[j], lockcreepname);
                    if (findcreep)
                        break;
                }
            }
        }
        return findcreep;
    }
    /**
     * 直接按本地位置来找
     * @param findroom
     */
    _addplanFindCreepRoom(lockroom, lockcreepname) {
        let lockcreep = Game.creeps[lockcreepname];
        let findcreep;
        let room78 = this.roomdatas.getRoomdata(lockroom);
        let creeps;
        if (room78)
            creeps = room78.getlocalcreeps(this.botkind); // global.mine9[lockroom][ckind]
        this.AddLog("  _addplan:"
            + lockroom + " " + lockcreepname
            + " " + this.botkind, 10, creeps);
        if (!creeps)
            return;
        for (let cname in creeps) {
            let creep = Game.creeps[cname];
            if (!creep) {
                delete creeps[cname];
                continue;
            }
            let storesourceid = creep.memory["sourceid"];
            this.AddLog("  createreqlist  test:"
                + lockroom + lockcreepname
                + (!Game.creeps[storesourceid])
                + (lockcreep) + (!Game.creeps[creep.memory["lockcreep"]]), 10, creep);
            //如果有任务在搞了 就继续干 大不了重新生产一个
            if (Game.creeps[storesourceid])
                continue;
            //如果没有任务 当前请求的机器人 已经生产出来了 先用了 
            if (lockcreep) {
                findcreep = cname;
                break;
            }
            //这里是当前请求的爬还没生产出来
            // if (!storecreep.memory["sourceid"]) {
            //如果这个任务要服务的没生产出来 先用
            let creeplock = creep.memory["lockcreep"];
            if (!Game.creeps[creeplock]) {
                findcreep = cname;
                break;
            }
            if (creeplock == lockcreepname) {
                findcreep = cname;
                break;
            }
        }
        return findcreep;
    }
    CreepRun(creep) {
        this.reflocal(creep);
        creep.memory["rolekind"];
        let rolekey = creep.memory["rolekey"];
        let roomname = creep.memory["roleroom"];
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test";
            this.AddLog("Creep   test in debug:" + this.logleave, 40, creep.pos);
        }
        if (creep.memory["isdebug"])
            this.logleave = 10;
        else
            this.logleave = this.logleaveAuto;
        if (creep.spawning)
            return;
        let creepid = creep.memory["sourceid"];
        if (!creepid) {
            creepid = creep.memory["lockcreep"];
            if (Game.creeps[creepid])
                creep.memory["sourceid"] = creepid;
        }
        let rolestep = creep.memory["rolestep"];
        let targetcreep = Game.creeps[creepid];
        //let rolekindtarget = role["rolekindtarget"]//目标类别
        if (!targetcreep) { //|| !rolelist[rolekindtarget][rolekey]
            delete creep.memory["rolekey"];
            delete creep.memory["sourceid"];
            //delete rolelist[this.rolekind][rolekey]
            this.AddLog("CreepStore  target out  over:" + creep.id, 0, creep);
            return;
        }
        this.AddLog("  CreepStore   :" + +rolestep + targetcreep.memory["rolekind"]
            + " " + creep.memory["rolekey"], 20, targetcreep);
        //有可能它的仓库不是我
        if (targetcreep) {
            let targetsource = targetcreep.memory["sourceid"];
            if (targetsource != creep.name) {
                delete creep.memory["rolekey"];
                delete creep.memory["sourceid"];
                if (creep.memory["lockcreep"] == creepid)
                    delete creep.memory["lockcreep"];
                this.AddLog("  creeprun clear rolekey   err targetcreep .memory[sourceid]:"
                    + this.logleave + rolekey, 40, creep.pos);
                return;
            }
            if (!rolekey) {
                creep.memory["rolekey"] = creepid;
            }
        }
        if (!rolekey) {
            return;
        }
        let targetid = creep.memory["targetid"];
        if (targetcreep
            && targetcreep.memory["targetid"] != targetid) {
            creep.memory["targetid"] = targetcreep.memory["targetid"];
            targetid = targetcreep.memory["targetid"];
        }
        //如果目标没出生 就先走到目标地点附近十步内
        let target = this.getObjectById(targetid);
        if (!targetcreep) {
            if (!target) {
                this.AddLog("  creeprun not exitst  targetcreep and  target :"
                    + targetid, 40, targetcreep);
                delete creep.memory["sourceid"];
                delete creep.memory["targetid"];
                return;
            }
            if (target.room.name != creep.room.name
                || !creep.pos.inRangeTo(target.pos, 10)) {
                creep.moveTo(target);
                this.AddLog("  creeprun not exitst move to target :" + targetid, 0, target.pos);
                return;
            }
            return;
        }
        //如果出生了 目标没在工作中 离它5步即可
        if (target && targetcreep.room.name != creep.room.name) {
            if (!creep.pos.inRangeTo(target.pos, 5)) {
                creep.moveTo(targetcreep);
                this.AddLog("  creeprun  exitst move to target :" + targetcreep.name, 10, targetcreep.pos);
                return;
            }
        }
        let targetrolestep = targetcreep.memory["rolestep"];
        if (targetrolestep != "working") {
            if (!creep.pos.inRangeTo(targetcreep, 2)) {
                if (!creep.pos.inRangeTo(targetcreep, 4)) {
                    if (creep.store.getUsedCapacity() >= 50)
                        creep.drop(RESOURCE_ENERGY);
                }
                creep.moveTo(targetcreep);
                return;
            }
            //这里要删除请求库存的信息
            return;
        }
        if (!creep.pos.isNearTo(targetcreep)) {
            if (!creep.pos.inRangeTo(targetcreep, 10)) {
                if (creep.store.getUsedCapacity() >= 50)
                    creep.drop(RESOURCE_ENERGY);
            }
            creep.moveTo(targetcreep);
            return;
        }
        this.moveMapNotOut(creep);
        if (creep.store.getFreeCapacity() >= 200) {
            this.ship78.addplan(creep.id, "t", "storecreep", creep.store.getFreeCapacity(RESOURCE_ENERGY), "energy");
            this.AddLog(" fill store33   :", 10, this.ship78.memoryclass[roomname]["t"]);
            return;
        }
        //if (creep.pos.isNearTo(target)) {
        //    rolestep = "working"
        //} else {
        //    rolestep = "move"
        //}
        //creep.memory["rolestep"] = rolestep;
        //let des = target["pos"];
        //if (rolestep == "move") {
        //    if (!creep.pos.isNearTo(target)) {
        //        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) >= 50) {
        //            creep.drop(RESOURCE_ENERGY, creep.store.getUsedCapacity(RESOURCE_ENERGY) - 50)
        //        }
        //        creep.moveTo(target)
        //        return
        //    }
        //    rolestep = "working"
        //    creep.memory["state"] = "state";
        //}
        //if (state == "working") {
        //if (creep.store.getFreeCapacity() == 0)
        //    return;
    }
}

/**
 * 任务类 入口
 * 总功能模块 和全局状态
 * */
class RoleCenter23 extends Basic78 {
    //------------------以下自动管理
    //----------------------------
    constructor(props) {
        super();
        this.classname = "RoleCenter";
        this.logleaveAuto = 40;
        super.init();
        //经常要调的参数
        this.seting = {
            rooms: {
                "W5S48": { roomname: "W5S48" },
                "W6S48": { roomname: "W6S48" },
                "W7S47": { roomname: "W7S47" }
                //, "W34N9": { roomname: "W34N9" }
                //, "W36N8": { roomname: "W36N8" }
                // , "E38N15": { roomname: "E38N15" }
            },
            outoce: {
                "W4S48": { roomname: "W4S48" },
                "W4S47": { roomname: "W4S47" },
                "W3S48": { roomname: "W3S48" },
                "W4S49": { roomname: "W4S49" },
                "W6S47": { roomname: "W6S47" },
                "W7S46": { roomname: "W7S46" },
                "W7S48": { roomname: "W7S48" },
                "W8S47": { roomname: "W8S47" },
                "W9S47": { roomname: "W9S47" }
                //, "W35N8": { roomname: "W35N8" }
                //, "W31S53": { roomname: "W31S53" }
                //, W31S55: { roomname: "W31S55" }
                //, W33S54: { roomname: "W32S54" }
            },
            catt: { //占地盘
            // "W7S47": { roomname: "W7S47" }
            }
        };
        //this.globalclass = global.mine9[this.classname]//任务挂
        //必须前置 new完带进来
        if (props) ;
        else {
            this.defaultinit(); //全用自己的就自动new
        }
        this.AddLog("RoleCenter23 new", 40); //1 2
        //delete Memory["creeps"]
    }
    runover() {
        //this.AddLog("RoleCenter23 runover", 40);//1 2
        let timeleave = 40;
        let dstart1 = new Date();
        let usetime2;
        dstart1 = new Date();
        this.CreepRun(); //这个第二后
        usetime2 = new Date().getTime() - dstart1.getTime();
        if (usetime2 >= 5)
            this.AddLog("creeprun   usetime:" + " " + usetime2, timeleave); //1 2
        dstart1 = new Date();
        this.spawn78.run(); //这个要最后
        usetime2 = new Date().getTime() - dstart1.getTime();
        if (usetime2 >= 2)
            this.AddLog("spawn78   usetime:" + " " + usetime2, timeleave); //1 2
        dstart1 = new Date();
        this.gameinit78.run(); //这个才要最后
        usetime2 = new Date().getTime() - dstart1.getTime();
        if (usetime2 >= 2)
            this.AddLog("gameinit78   usetime:" + " " + usetime2, timeleave); //1 2
    }
    run() {
        let timeleave = 40;
        //if (!global.mine9["Spawn78"]) global.mine9["Spawn78"] = {}
        //global.mine9["Spawn78"]["createlist"] = {}
        let dstartall = new Date();
        let dstart1 = new Date();
        let usetime2;
        try {
            this.roomdatas.run();
            this.test();
            usetime2 = new Date().getTime() - dstart1.getTime();
            if (usetime2 >= 2)
                this.AddLog("test   usetime1:" + " " + usetime2, timeleave); //1 2
        }
        catch (e) {
            this.AddLog("catch roomdatas.run err  :", 90);
        }
        //try {
        dstart1 = new Date();
        //this.terminal78.run();
        //this.test78.run()
        this.up78.run();
        usetime2 = new Date().getTime() - dstart1.getTime();
        if (usetime2 >= 2)
            this.AddLog("up78   usetime:" + " " + usetime2, timeleave); //1 2
        //} catch(e) {
        //    this.AddLog("catch up78.run err  :", 90);
        //} 
        //try {
        dstart1 = new Date();
        this.oce78.run();
        usetime2 = new Date().getTime() - dstart1.getTime();
        if (usetime2 >= 2)
            this.AddLog("oce78   usetime:" + " " + usetime2, timeleave); //1 2
        //} catch(e) {
        //    this.AddLog("catch oce78.run err  :", 90);
        //} 
        //try {
        dstart1 = new Date();
        this.ship78.run();
        usetime2 = new Date().getTime() - dstart1.getTime();
        if (usetime2 >= 2)
            this.AddLog("ship78   usetime:" + " " + usetime2, timeleave); //1 2
        //} catch (e) {
        //    this.AddLog("catch ship78.run err  :", 90);
        //} 
        //try {
        dstart1 = new Date();
        this.build78.Run();
        usetime2 = new Date().getTime() - dstart1.getTime();
        if (usetime2 >= 2)
            this.AddLog("build78   usetime:" + " " + usetime2, timeleave); //1 2
        //} catch(e) {
        //    this.AddLog("catch build78.run err  :", 90);
        //} 
        try {
            dstart1 = new Date();
            this.watch78.Run();
            this.def78.run();
            //this.attsimp.Run();
            usetime2 = new Date().getTime() - dstart1.getTime();
            if (usetime2 >= 2)
                this.AddLog("claim78 def78   usetime:" + " " + usetime2, timeleave); //1 2
        }
        catch (e) {
            this.AddLog("catch def78.run err  :", 90);
        }
        //try {
        dstart1 = new Date();
        this.claim78.Run();
        usetime2 = new Date().getTime() - dstart1.getTime();
        if (usetime2 >= 2)
            this.AddLog("claim78 watch78   usetime:" + " " + usetime2, timeleave); //1 2
        //} catch(e) {
        //    this.AddLog("catch claim78.run err  :", 90);
        //} 
        usetime2 = new Date().getTime() - dstartall.getTime();
        if (usetime2 >= 5)
            this.AddLog("all   usetime:" + " " + usetime2, timeleave); //1 2
    }
    CreepRun() {
        for (var crindex in Game.creeps) {
            let creep = Game.creeps[crindex];
            let dstart1 = new Date();
            let rolekind = creep.memory["rolekind"];
            let rolekey = creep.memory["rolekey"];
            creep.memory["rolestep"];
            creep.memory["roletype"];
            this.AddLog("CreepRun :" + rolekind + " " + creep.memory["kind"]
                + " " + rolekey + " " + creep.id, 20, creep.pos);
            //try {
            switch (rolekind) {
                case "AttSimp":
                    //this.attsimp.CreepRun(creep);
                    break;
                case "Def78":
                    this.def78.CreepRun(creep);
                    break;
                case "Claim78":
                    this.claim78.CreepRun(creep);
                    break;
                case "Watch78":
                    //try {
                    this.watch78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch CreepRun watch78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break;
                case "Store78":
                    //try {
                    this.store78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch CreepRun store78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break;
                case "Build78":
                    //try {
                    this.build78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch CreepRun Build78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break;
                case "Ship78":
                    //try {
                    this.ship78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch CreepRun Ship78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break;
                case "Oce78":
                    this.oce78.CreepRun(creep);
                    break;
                case "Up78":
                    /*try {*/
                    this.up78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch up78 Build78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break;
            }
            //} catch (e) {
            //    this.AddLog("catch CreepRun err  :" + rolekind, 90, creep.pos);
            //}
            let usetime2 = new Date().getTime() - dstart1.getTime();
            if (usetime2 >= 3)
                this.AddLog(" CreepRun time:" + usetime2 + " " + rolekind + " " + rolekey, 40, creep.pos); //0 1
        }
    }
    defaultinit() {
        let seting = this.seting;
        //try {
        this.roomdatas = new RoomData78(null); //这个必须第一
        //} catch (e) {
        //    this.AddLog("   defaultinit new RoomData78:" , 90,e);
        //}
        this.spawn78 = new Spawn78({
            roomdatas: this.roomdatas,
            seting: seting
        });
        this.ship78 = new Ship78({
            roomdatas: this.roomdatas,
            createlv: 55 //50
            ,
            spawn78: this.spawn78,
            botkind: "CShip78" //可以自动调配的BOT类型
        });
        //this.move78 = new Move78({ roomdatas: this.roomdatas });
        this.gameinit78 = new GameInit({ roomdatas: this.roomdatas });
        //this.test78 = new Test(null);
        this.store78 = new Store78({
            roomdatas: this.roomdatas,
            ship78: this.ship78,
            spawn78: this.spawn78,
            botkind: "CStore78" //可以自动调配的BOT类型
            ,
            createlv: 50
        });
        this.oce78 = new Oce78({
            roomdatas: this.roomdatas,
            ship78: this.ship78,
            spawn78: this.spawn78,
            botkind: "COce78" //可以自动调配的BOT类型
            ,
            createlv: 70,
            seting: seting
        });
        this.build78 = new Build78({
            roomdatas: this.roomdatas,
            ship78: this.ship78,
            spawn78: this.spawn78,
            store78: this.store78,
            botkind: "CBuild78" //可以自动调配的BOT类型
            ,
            createlv: 65,
            walldefault: 20 * 1000,
            seting: seting,
            wall: {
                "W6S48": 80 * 1000,
                "W5S48": 80 * 1000,
                "W7S47": 80 * 1000
            }
        });
        this.claim78 = new Claim78({
            roomdatas: this.roomdatas,
            spawn78: this.spawn78,
            botkind: "CClaim78" //可以自动调配的BOT类型
            ,
            createlv: 40,
            seting: seting
        });
        this.up78 = new Up78({
            roomdatas: this.roomdatas,
            ship78: this.ship78,
            spawn78: this.spawn78,
            botkind: "CUp78" //可以自动调配的BOT类型
            ,
            createlv: 45 //45
            ,
            warknummax: 15,
            seting: seting
        });
        this.watch78 = new Watch78({
            roomdatas: this.roomdatas,
            spawn78: this.spawn78,
            botkind: "CWatch78" //可以自动调配的BOT类型
            ,
            createlv: 999 //反正才50
            ,
            seting: seting
        });
        this.def78 = new Def78({
            roomdatas: this.roomdatas,
            spawn78: this.spawn78,
            botkind: "CDef78" //可以自动调配的BOT类型
            ,
            createlv: 100,
            seting: seting
        });
        //this.attsimp = new AttSimp({
        //    roomdatas: this.roomdatas, 
        //    spawn78: this.spawn78 
        //    , botkind: "CAttSimp"//可以自动调配的BOT类型
        //    , createlv: 10 
        //    , seting: seting
        //    , attrooms: {
        //       // "W31S54": { roomname: "W31S54" }
        //    }
        //});   
        //this.lab78 = new Lab78({ roomdatas: this.roomdatas }); 
        //this.terminal78 = new Terminal78({
        //    baseroom: "E38N16"
        //    , roomdatas: this.roomdatas
        //    , "storelist": {
        //        //E42N59: {
        //        //    K: { num: 1000, buyval: 0.701 }
        //        //    , H: { num: 1000, buyval: 10.002 }
        //        //    , KH: { num: 1000, buyval: 10.011 }
        //        //}
        //    }
        //    , EnergySellValue:8.001
        //})
    }
    test() {
        let debugcreep = Game.creeps["debug"];
        if (debugcreep) {
            this.debugrolekey = debugcreep.memory["rolekey"];
            this.debugsourceid = debugcreep.memory["sourceid"];
            this.debugtargetid = debugcreep.memory["targetid"];
            this.debugcreepname = debugcreep.memory["creepname"];
        }
        else {
            this.debugrolekey = "";
            this.debugsourceid = "";
            this.debugtargetid = "";
            this.debugcreepname = "";
        }
        //this.lab78.getLabForBoost("E38N16","KH",100,"test")
        //let room78 = this.roomdatas.getRoomdata("E38N16")
        //let spawns = room78.globalclass["spawn"]
        delete Memory["rolelist78"]["undefined"];
        delete Memory["rolelist78"]["Test"];
        //global.mine9["Spawn78"]["createlist"] = {}    
    }
}

//import { sayHello } from './menu/test'
//require('Move3');
//import { wrapFn, MoveTo3 } from "./Move3"
//let test = require('./Move3')
//console.log(test)
const loop = errorMapper(() => {
    //if (_global_memory) {
    //    delete global.Memory;
    //    global.Memory = _global_memory;
    //    RawMemory._parsed = global.Memory;
    //} else {
    //    _global_memory = global.Memory
    //}
    //console.log(wrapFn)
    //console.log(MoveTo3)
    //Creep.prototype.moveTo = wrapFn(MoveTo3 , 'moveTo');
    if (!global.tick || global.tick >= 100) {
        global.tick = 1;
    }
    else
        global.tick++;
    //sayHello();
    if (Game.cpu.bucket == 10000) {
        Game.cpu.generatePixel();
    }
    if (!global.mine9)
        global.mine9 = {};
    if (!global.RoleCenter23) {
        global.RoleCenter23 = new RoleCenter23(null);
        //global.RoleCenter = new RoleCenter({
        //    ship78: global.RoleCenter23.ship78
        //    , spawn78: global.RoleCenter23.spawn78
        //}) 
    }
    //new RoleCenter08().run9()
    //global.mine9["Spawn78"]["createlist"] = {}
    global.RoleCenter23.run();
    //global.RoleCenter.run()
    global.RoleCenter23.runover();
    // delete Memory["rolelist78"]["Oce78"]["sources"]
    //delete Memory["rolelist78"] 
    //delete Memory["rolelist78"]["Ship78"]
    //delete Memory["rolelist78"]["Up78"]["controlls"]["5bbcab1e9099fc012e632df2"]
});

exports.loop = loop;
//# sourceMappingURL=main.js.map
