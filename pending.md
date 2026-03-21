issues

questions generation logic, not entrance level right now , and might be a little rough right now, need a solid logic, do we need a better model ? 

Pending, when questions bank becomes big , how do we prevnet to generate questions which we already have ? we can dedupe but it just wastes more token and then we run again , this is ok for smaller questions bank size but when we get arond 500-1000, we are going to have trouble generating next few questions , the main issue , each time we are not gonna provide the whole questions list to gpt , that way the context window be filled with this only without even genrating questions and without providing the questions which we already have , how will it know which questions we have and which not ? 

cron job which will run every 30 minutues or hour to check every user existing prefrence exam questions ,are they enough to perfrom next 2 exam more , are there enough questions 