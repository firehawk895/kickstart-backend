var constants = require('../constants')
module.exports = {
    'name': {
        notEmpty: {
            errorMessage: 'name cannot be empty',
        }
    },
    'location_name': {
        optional: true,
        notEmpty : {
            errorMessage : "Please enter location for the leader"
        }
    },
    'lat': {//
        optional: true,
        isLat: {
            errorMessage: "Enter a valid latiude"
        }
    },
    'long': {//
        optional: true,
        isLong: {
            errorMessage: "Enter a valid longitude"
        }
    },
    'mobile': {
        // optional: undefined, uncomment it and it doesnt work OMFG
        isMobilePhone: {
            options: ['en-IN'],
            errorMessage: 'Enter a valid Indian mobile number'
        }
    },
}