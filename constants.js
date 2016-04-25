module.exports = {
    graphsRelations: {
        leader: {
            myJobseekers: "myJobseekers"
        },
        jobseekers: {
            myLeader: "myLeader",
            interviews: "interviews"
        },
        vacancies: {
            hasJobSeekers: "hasJobSeekers"
        }
    },
    //keyed with number so that
    //"below" education type queries can be run
    education: {
        "Below 8th": 0,
        "10th pass": 1,
        "12th pass": 2,
        "Pursuing graduation": 3,
        "Graduate": 4,
        "Diploma(technical)": 5,
        "Masters(arts, comm, science)" : 6,
        "Mba": 7
    },
    communication: [
        "Basic hindi",
        "Fluent hindi",
        "Basic english"
    ],
    license: [
        "Non-commercial",
        "Commercial",
        "Learning",
        "None"
    ],
    computer: [
        "Basic computer operator", //(basic MS Excel, Word, internet, emails)
        "Advanced computer",
        "Tally",
        "Computer Languages",
        "Graphic Design",
        "None"
    ],
    trades: [
        "Housekeeping",
        "Security",
        "Back Office",
        "Delivery",
        "Sales Executive",
        "Field Staff",
        "Driver",
        "Helper",
        "Hospital Staff",
        "Hospitality Executive",
        "Supervisor",
        "Packers",
        "Team Member",
        "Promotional Staff",
        "Assistance Manager",
        "Plumber",
        "Electrician",
        "Field Supervisor",
        "Kitchen Staff"
    ],
    company : [
        "Mc Donalds"
    ],
    jobStatus : [
        "Unemployed",
        "Looking for job",
        "Not looking for job"
    ],
    interviewStatus: {
        scheduled: "scheduled",
        appeared: "appeared",
        cleared: "cleared",
        joined: "joined",
        monetized: "monetized"
    },
    notifications: {
        path: "/notifications",
        type: {
            inApp: "app",
            push: "push",
            both: "both",
        },
        redirect: {
            vacancies: "vacancies"
        }
    },
    events: {
        newVacancy: "newVacancy"
    }
}