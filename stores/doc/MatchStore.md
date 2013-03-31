## Match Store

A store that uses a substring matcher to find a set of keys  that match and return their associated record.

### Why?

_Traxx Specific_: The inital use for this store is to allow users to type in partial matches to find securities. The store will be wrapped with a service layer which will allow it to talk directly to jquery's autocomplete.

### Definition of Match

We will consider a match X, to be a match of the regular expresstion /^.*X.*$/. In other words, the match string is any substring (not just a prefix) of the key.

### Requirements

The MatchStore will need to support the normal store fuctions:

* `fRead`

~~~js
// MatchStore.fRead 
//  calls back with all values which match the current key, as per our definition of match
//
// Params
//   vs := the search parameters
//          [0] := `sMatch` - the string we need to match
//          [1...n] := `vsField` - the fields to return
//   fCallback := `function(err,vxValue)` the values whose keys matched 
//
~~~


* `fWrite`

~~~js
// MatchStore.fWrite
//   add a new key value pair to the store, adds index into initial set
//
// Params
//   vs := the search parameters
//          [0] := `sKey` - the key under which the value is to be stored
//          [1...n] := `vsField` - if provided only these values will be written
//                      and will be merged into any prexisting value
//
//   xValue := the value to store
//
//   fCallback := `function(err)` called when done
~~~



* `fDelete`

~~~js
// MatchStore.fDelete 
//  removes all values which match the current key, as per our definition of match
//
// Params
//   vs := the search parameters
//          [0] := `sMatch` - the string we need to match
//          [1...n] := `vsField` - the fields to return
//
//   fCallback := `function(err)` 
//
// Side Effects
//   flushes the internal match cache table completely as fixing it would 
//   be too slow
//
~~~


Note in some instances, the value of sKey might also be found within xValue (e.g. where the key is one field in the a Mongo document). In such instances the value of `sKey` and `xValue[sKey]` should match.

### Strategy


#### MongoMatchStore

We do not currently plan to implement a MongoMatchStore, but if we do could make use of underlying Mongo `$regex` functionality

#### MemoryMatchStore

Because keeping all the partial matches around would be memory prohibitive in most cases, we will instead use a configurable ring buffer to store the last N match-subsets. In most cases, a subsequent search will be a search over a prior match-subset.

A search will begin by examining the ring buffer and finding the longest prefix to the matching string. The match-subset becomes the search-set. If no prefix found then the search-set is set to the entire dataset.

Item by item examination over the search-set is then performed by examination of the tail-characters only, where the tail characters are defined to to be the characters which are in the match but not in the match-prefix.

Each match adds to the match-set an item which contains: `{ s: n:}` where `s` is a pointer to the key string and n is an index of the first character that in the match.

##### An example

Consider the list:

    [
		"apple",
		"applause",
		"appeal",
		"slaphappy"
	]
	
Conceptually the no-match-subset will be represented as:

	{ 
		sMatch : "", 
		vaMatchSet : [
			{ s: "apple", n:0 },
			{ s: "apple", n:1 },
			{ s: "apple", n:2 },
			{ s: "apple", n:3 },
			{ s: "apple", n:4 },
			{ s: "applause", n:0 },
			{ s: "applause", n:1 },
			{ s: "applause", n:2 },
			{ s: "applause", n:3 },
			{ s: "applause", n:4 },
			{ s: "applause", n:5 },
			{ s: "applause", n:6 },
			{ s: "applause", n:7 },
			{ s: "appeal", n:0 },
			{ s: "appeal", n:1 },
			{ s: "appeal", n:2 },
			{ s: "appeal", n:3 },
			{ s: "appeal", n:4 },
			{ s: "appeal", n:5 },
			{ s: "slaphappy", n:0 },
			{ s: "slaphappy", n:1 },
			{ s: "slaphappy", n:2 },
			{ s: "slaphappy", n:3 },
			{ s: "slaphappy", n:4 },
			{ s: "slaphappy", n:5 },
			{ s: "slaphappy", n:6 },
			{ s: "slaphappy", n:7 },
			{ s: "slaphappy", n:8 }
		]
	}
	

In practice, we might actually not store the no-match-subset at all, and instead use special purpose code which examines the original list. Though, given the subsetting nature of the algorithm, it might actually be faster due to memory managment to build the entire list, so that every subset simply reuses the list items.

A search for the string "p" will result in a match-subset of

	{ 
		sMatch : "p", 
		vaMatchSet : [
			{ s: "apple", n:1 }
			{ s: "apple", n:2 }
			{ s: "applause", n:1 }
			{ s: "applause", n:2 }
			{ s: "appeal", n:1 }
			{ s: "appeal", n:2 }
			{ s: "slaphappy", n:3 },
			{ s: "slaphappy", n:6 },
			{ s: "slaphappy", n:7 }
		]
	}


This is done by looking at each entry in the no-match-subset, at position n, and checking if it is the first letter in the match (in this case "p")

This match-subset is stored in a ring buffer, and will hopefully be available for the next query.


A search for the string "pp", will first examine the list of match-subsets in the ring buffer. The longest prefix match is used.

If the prior query has not been flushed, it will be the longest match. The `test_character` will be 'p' and the `offset` will be 1. Then each entry in the prior match-subset string s at position `n+offset` for equality with the `test_character`. Yielding the set:

	{ 
		sMatch : "pp", 
		vaMatchSet : [
			{ s: "apple", n:1 }
			{ s: "applause", n:1 }
			{ s: "appeal", n:1 }
			{ s: "slaphappy", n:6 },
		]
	}
	
A search for the string "ppl", will yield:

	{ 
		sMatch : "ppl", 
		vaMatchSet : [
			{ s: "apple", n:1 }
			{ s: "applause", n:1 }
		]
	}
	
A search for the string "ppla", will yield:

	{ 
		sMatch : "ppla", 
		vaMatchSet : [
			{ s: "applause", n:1 }
		]
	}
	





