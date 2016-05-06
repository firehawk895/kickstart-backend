var constants = require('../constants')
module.exports = {
    'name': {
        notEmpty: true,
        errorMessage: 'name cannot be empty',
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
        optional: true,
        isBoolean: {
            errorMessage: 'isVerified status must be true/false'
        }
    }
}