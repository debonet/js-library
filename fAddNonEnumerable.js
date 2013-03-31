
//----------------------------------------------------------------------------
// Shorthand to add a non-enumerable property to an object
function fAddNonEnumerable(o,s,f){

	Object.defineProperty(
		o,
		s,
		{
			value: f,
			enumerable: false
		}
	);
}


//----------------------------------------------------------------------------
// EXPORTS
//----------------------------------------------------------------------------
module.exports = fAddNonEnumerable;
