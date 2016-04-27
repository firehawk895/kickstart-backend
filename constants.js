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
    communication: {
        "Basic hindi": 0,
        "Fluent hindi": 1,
        "Basic english": 2,
        "Fluent english": 3
    },
    license: {
        "None": 0,
        "Learning": 1,
        "Non-commercial": 2,
        "Commercial": 3
    },
    computer: {
        "None": 0,
        "Basic": 1,
        "Advanced": 2
    },
    trades: [
        "Telecaller",
        "Marketing",
        "Accountant",
        "Customer Support",
        "Office Assistant",
        "Nursing",
        "Manager",
        "Cook",
        "HR",
        "Operations",
        "Data Entry",
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
        "Plumber",
        "Electrician",
        "Field Supervisor",
        "Kitchen Staff"
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