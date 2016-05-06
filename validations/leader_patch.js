var constants = require('../constants')
module.exports = {
    'name': {
        optional : true,
        notEmpty: true,
        errorMessage: 'name cannot be empty',
    },
    'mobile': {
        optional: true,
        isMobilePhone: {
            options: ['en-IN'],
            errorMessage: 'Enter a valid Indian mobile number'
        },
    },
    'isVerified': {
        optional: true,
        isBoolean: {
            errorMessage: 'isVerified status must be true/false'
        }
    }
}