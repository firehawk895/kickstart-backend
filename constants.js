module.exports = {
    graphsRelations: {
        leader: {
            myJobseekers: "myJobseekers"
        },
        jobseekers: {
            myLeader: "myLeader",
            interviews : "interviews"
        },
        vacancies : {
            hasJobSeekers : "hasJobSeekers"
        }
    },
    //keyed with number so that
    //"below" education type queries can be run
    education: {
        "below 10th": 1,
        "10th pass": 2,
        "below 12th": 3,
        "12th pass": 4,
        "pursuing grad": 5,
        "graduate and above": 6
    },
    interviewStatus: {
        scheduled : "scheduled",
        appeared : "appeared",
        failed : "failed",
        cleared : "cleared",
        joined : "joined",
        monetized : "monetized"
    }
}