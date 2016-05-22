var constants = require('../constants')
module.exports = {
    'name': {
        notEmpty : {
            errorMessage : 'name cannot be empty'
        }
    },
    'location_name': {
        notEmpty : {
            errorMessage : "Please enter location for the leader"
        }
    },
    'lat': {//
        isLat: {
            errorMessage: "Enter a valid latitude"
        }
    },
    'long': {//
        isLong: {
            errorMessage: "Enter a valid longitude"
        }
    },
    'mobile': {
        // optional: undefined, uncomment it and it doesnt work OMFG
        isMobilePhone: {
            options: ['en-IN'],
            errorMessage: 'Enter a valid Indian mobile number'
        },
        isNewUser: {
            errorMessage: 'Leader already exists'
        }
    },
    'isVerified': {
        isBoolean: {
            errorMessage: 'isVerified status must be true/false'
        }
    }
}