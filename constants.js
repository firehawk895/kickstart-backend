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
        "below 8th": 0,
        "10th pass": 1,
        "12th pass": 2,
        "pursuing graduation": 3,
        "graduate": 4,
        "diploma(technical)": 5,
        "masters(arts, comm, science)" : 6,
        "mba": 7
    },
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