/**
 * Created by Jerome on 07-06-17.
 */

var Codec = {};

Codec.updateSchema = {
    propertiesBytes: 1, // Size in bytes of the properties bitmask
    strings: ['playerName'],
    booleans: ['isAlive','isPoweredUp'],
    booleanBytes: 1, // How many bytes are used to store the boolean properties
    numerical:{
        playerScore: 2, // Use 2 bytes to represent playerScore
        coins: 2,
        x: 1, // Use 1 byte to represent x coordinate
        y: 1
    }
};

/* ### ENCODING ### */

Codec.encode = function(message,schema){
    var size = Codec.computeSize(message,schema); // Count how many bytes should be allocated in the buffer
    console.log('size = '+size+' bytes');
    var buffer = new ArrayBuffer(size);
    Codec.encodeBuffer(message,buffer,schema);
    return buffer;
};

Codec.computeSize = function(message,schema){ // compute the size in bytes of the ArrayBuffer to create
    var size = 0;
    size += schema.propertiesBytes; // add the bytes necessary for the bitmask

    if(schema.numerical) {
        // Count the bytes needed for numerical values
        Object.keys(schema.numerical).forEach(function (key) {
            if(message[key] !== undefined) size += schema.numerical[key]; // If the message has that property, allocate the corresponding amount of bytes
        });
    }

    if(schema.strings) {
        // Count the bytes need for each string
        schema.strings.forEach(function (key) {
            if(message[key] !== undefined) size += message[key].length + 1; // 1 byte per character + 1 byte to store the length of the string
        });
    }

    size += schema.booleanBytes; // Add schema.booleanBytes bytes to store the booleans (one boolean per bit)
    return size;
};

Codec.encodeBuffer = function(message,buffer,schema){
    var dv = new DataView(buffer); // A DataView is needed to interact with the buffer
    var offset = 0; // Offset, in bytes, from the start of the buffer, where the new bytes should be written
    var bitmaskOffset = offset; // Where the bitmask will be written once we know it
    offset = Codec.encodeBytes(dv,bitmaskOffset,schema.propertiesBytes,0); // Temporary 0 value for the bitmask
    var bitmask = 0; // The bitmask will be created as we go, and then stored in the arrayBuffer

    if(schema.numerical) {
        Object.keys(schema.numerical).forEach(function (key) {
            if(message[key] !== undefined){ // If the message contains that propertie, encode it
                offset = Codec.encodeBytes(dv,offset,schema.numerical[key],message[key]);
                bitmask |= 1; // Bitwise operation to indicate in the mask that the current property is present in the message
            }
            bitmask <<= 1; // Shift the bitmask to the next property
        });
    }

    if(schema.strings) {
        schema.strings.forEach(function (key) {
            if(message[key] !== undefined){
                var length = message[key].length;
                offset = Codec.encodeBytes(dv,offset,1,length); // Store the length of each string in a separate byte
                Codec.encodeString(dv, offset,message[key]);
                offset += length;
                bitmask |= 1;
            }
            bitmask <<= 1;
        });
    }

    if(schema.booleans){
        var booleans = 0; // Create a bitmask to store the values of each boolean, one per bit
        schema.booleans.forEach(function (key) {
            if(message[key] !== undefined) {
                bitmask |= 1; // Indicate in the mast that the boolean is present
                booleans |= +message[key]; // Indicate its actual value using a bitwise operation
            }
            bitmask <<= 1;
            booleans <<= 1;
        });
        booleans >>= 1;
        offset = Codec.encodeBytes(dv,offset,schema.booleanBytes,booleans);
    }
    bitmask >>= 1;
    dv['setUint'+(schema.propertiesBytes*8)](bitmaskOffset, bitmask); // Write the bitmask byte
};

Codec.encodeBytes = function(dv,offset,nbBytes,value){ // Allocate nbBytes for value at offset in dataview "dv", then return the new offset
    dv['setUint'+(nbBytes*8)](offset, value);
    offset+=nbBytes;
    return offset;
};

Codec.encodeString = function(dv,offset,str) {
    for (var i=0, strLen=str.length; i<strLen; i++) {
        dv.setUint8(offset,str.charCodeAt(i));
        offset++;
    }
};

/* ### DECODING ### */

Codec.decode = function(buffer,schema){
    var dv = new DataView(buffer);
    var offset = 0;
    var message = {};

    var nbProperties = Codec.countProperties(schema); // Determine how many properties are listed in the schema
    // schema.propertiesBytes indicates how many bytes are required to make a mask for all the possible properties of the schema
    var bitmask = dv['getUint'+(schema.propertiesBytes*8)](offset); // read the bitmask, or series of bits indicating the presence or absence of each property of the schema in the message
    offset+=schema.propertiesBytes;
    var idx = 1; // index of the next field that will be checked, use to shift the properties mask correctly in isMaskTrue()

    if(schema.numerical) {
        Object.keys(schema.numerical).forEach(function (key) {
            if(Codec.isMaskTrue(bitmask,nbProperties,idx)) { // check the properties bitmask to see if the property is present in the message or not, and therefore has to be decoded or skipped
                var nbBytes = schema.numerical[key];
                message[key] = dv['getUint' + (nbBytes * 8)](offset); // calls e.g. dv.getUint8, dv.getUint16 ... depending on how many bytes are indicated as necessary for the given field in the schema
                offset += nbBytes;
            }
            idx++;
        });
    }

    if(schema.strings) {
        schema.strings.forEach(function (key) {
            if(Codec.isMaskTrue(bitmask,nbProperties,idx)) {
                // Same process as for the numerical fields, but need to decode one additional byte to know the length of each string
                var length = dv.getUint8(offset);
                offset++;
                message[key] = Codec.decodeString(dv, length, offset);
                offset += length; // CoDec.bytesPerChar indicates how many bytes should be allocated to encode one character in a string
            }
            idx++;
        });
    }

    if(schema.booleans){
        var booleans = dv['getUint'+(schema.booleanBytes*8)](offset); // just like propertiesMask, bools is a mask indicating the presence/absence of each boolean
        var boolidx = 1; // index of the next boolean to decode
        offset += schema.booleanBytes;
        schema.booleans.forEach(function (key) {
            if(Codec.isMaskTrue(bitmask,nbProperties,idx)) message[key] = !!Codec.isMaskTrue(booleans,schema.booleans.length,boolidx); // !! converts to boolean
            idx++;
            boolidx++;
        });
    }

    return message;
};

Codec.countProperties = function(schema){
    // Returns the total number of fields in the schema (regardless of being present in the object to decode or not)
    // This information is needed to properly read the properties mask, to know by how much to shift it (see isMaskTrue() )
    var nbProperties = 0;
    if(schema.numerical !== undefined) nbProperties += Object.keys(schema.numerical).length;
    if(schema.strings !== undefined) nbProperties += schema.strings.length;
    if(schema.booleans !== undefined) nbProperties += schema.booleans.length;
    return nbProperties;
};

Codec.isMaskTrue = function(mask,nbProperties,idx){ // Process a bitmask to know if a specific field, at index idx, is present or not
    return (mask >> (nbProperties-idx)) & 1; // Shift right to put the target at position 0, and AND it with 1
};

Codec.decodeString = function(view,length,offset) { // Read length bytes starting at a specific offset to decode a string
    var chars = [];
    for(var i = 0; i < length; i++){
        chars.push(String.fromCharCode(view.getUint8(offset)));
        offset ++;
    }
    return chars.join('');
};

if(typeof window === 'undefined') module.exports.Codec = Codec;