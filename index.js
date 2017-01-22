console.log("Starting program @ " + new Date().getHours() + " hours.")

//Required libraries
var Alexa = require('alexa-sdk');
var Feed = require('dans-rss-to-json');

//Variables
var servingLineIndexes =
{
    'akers':     0, // Akers
    'brody':     5, // Brody
    'case' :     3, // Case
    'gallery':   4, // Snyder Phillips
    'holden':    2, // Holden
    'holmes':    2, // Holmes
    'landon':    2, // Landon
    'riverwalk': 0, // Riverwalk
    'shaw':      2, // Shaw
    'wilson':    3, // Wilson
};
var cafeLocations = 
{
    'akers':     '908 Akers Road', // Akers
    'brody':     '241 Brody Road', // Brody
    'case' :     '842 Chestnut Road', // Case
    'gallery':   '362 Bogue Street', // Snyder Phillips
    'holden':    '234 Wilson Road', // Holden
    'holmes':    '919 East Shaw Lane', // Holmes
    'landon':    '632 West Circle Drive', // Landon
    'riverwalk': 'McDonell Hall at 817 East Shaw Lane', // Riverwalk
    'shaw':      '591 North Shaw Lane', // Shaw
    'wilson':    '219 Wilson Road', // Wilson
};
var htmlReplacements =
{
    '&#039;': "'",
}
var Rgx = new RegExp('"> [-]?([A-Za-z ]+)</')

function getFoodType()
{
    var date = new Date();
    var timeOfDay = date.getHours() + (date.getMinutes() / 100);
    if(timeOfDay >= 0)
    {
        if(timeOfDay <= 10.30)
        {
            return "breakfast";
        }
        else if(timeOfDay <= 15.30)
        {
            return "lunch"
        }
        else if(timeOfDay <= 21)
        {
            return "dinner"
        }
        else
        {   
            return "late-night"
        }
    }
    return timeOfDay;
}

function getFoodFromHtml(html)
{
    var foodItems = []
    var numFoodItems = 0;
    var match;

    while((match = Rgx.exec(html)) != null)
    {
        if(match[1] != match[1].toLocaleUpperCase() && match[1].toLocaleLowerCase().trim() != "closed") //Remove things like "FRONT STATION"
        {
            foodItems.push(match[1].trim());
        }
        html = html.replace(match[1], "");
    }

    return foodItems;
}

//getFoodItems("case", null, function(food){console.log(food);});

function getFoodItems(cafe, foodType, fn)
{
    cafe = cafe.toLocaleLowerCase();
    Feed.load('https://eatatstate.com/menus/' + cafe + '/feed', (err, rss) =>
    {
        foodType = foodType || getFoodType();
        
        console.log(rss["title"] + " - " + rss["description"]); //SOUTH POINTE DINING - Case Dining Menus for current day.
        console.log("Food type: " + foodType);
        console.log("");
        

        var htmlDescription = rss.items[servingLineIndexes[cafe]].description;

        //console.log(".description eq");
        //console.log(htmlDescription);

        
        //Cut off irrelevant html data
        switch(foodType)
        {
            case "breakfast":
            {
                //Only grabs html data before "Lunch Menu: " appears in code
                htmlDescription = htmlDescription.substring(0, htmlDescription.indexOf("Lunch Menu:&nbsp"));
                break;
            }
            case "lunch":
            {
                //Only grabs html data after "Lunch Menu: " appears in code & before "Dinner Menu: "
                htmlDescription = htmlDescription.substring(htmlDescription.indexOf("Lunch Menu:&nbsp"), htmlDescription.indexOf("Dinner Menu:&nbsp"));
                break;
            }
            case "dinner":
            {
                //Only grabs html data after "Dinner Menu: " appears in code & before "Late Night: "
                htmlDescription = htmlDescription.substring(htmlDescription.indexOf("Dinner Menu:&nbsp"), htmlDescription.indexOf("Late Night:&nbsp"));
                break;
            }
            default:
            {
                htmlDescription = htmlDescription.substring(htmlDescription.indexOf("Late Night:&nbsp"), htmlDescription.length);
                break;
            }
        }

        //To make "Chef&#039;s Choice Salad" -> "Chef's Choice Salad"
        for(var replacementKey in htmlReplacements)
        {
            htmlDescription = htmlDescription.replace(replacementKey, htmlReplacements[replacementKey]);
        }

        foodItems = getFoodFromHtml(htmlDescription);

        fn(foodItems);
    });
}

var handlers = {
    'LaunchRequest': function () {
        var say = 'Welcome to the Spartan Menu application!';
        this.emit(':ask', say, 'try again');
    },

    'Unhandled': function () {
        this.emit(':ask', `I\'m sorry, but I\'m not sure what you asked me.`);
    },

    'GetMenuItem': function() {
        var foodType = this.event.request.intent.slots.Meals.value;
        var myLocation = this.event.request.intent.slots.Locations.value;
        var say = '';

        myLocation = myLocation.toLocaleLowerCase();
        
        if (foodType === undefined && myLocation !== undefined){ 
            //no specific time given, but location given then assume user means right now
            //compare current time to times for meals
            // breakfast 07:00 - 10:30, lunch 10:31-15:30, dinner 15:31-21:00, late night 20:00-24:00, if between 24:00-7:00 return no meals at this time
            
            var date = new Date();
            var timeOfDay;
            timeOfDay = date.getHours() + (date.getMinutes() / 100);//servers must be on a weird time zone, so -5 hrs from time lol
            foodType = getFoodType();

            getFoodItems(myLocation, foodType, (foodItems) =>
            {
                if(foodItems.length == 0)
                {
                    say = "Unfortunately, " + foodType + " at " + myLocation + " is closed.";
                }
                else
                {
                    say = 'Right now it is ' + foodType + ' time at ' + myLocation + ' and they are serving '; //        need food stuff in this function
                    for(var item in foodItems)
                    {
                        say = say + foodItems[item] + ', '
                    }
                }

                this.emit(':ask', say, 'try again');
            });
        }
        
        else if (foodType !== undefined && myLocation !== undefined)
        {
            getFoodItems(myLocation, foodType, (foodItems) =>
            {
                console.log(foodItems);
                if(foodItems.length == 0)
                {
                    say = "Unfortunately, " + foodType + " at " + myLocation + " is closed.";
                }
                else
                {
                    say = 'For ' + foodType + ' at ' + myLocation + ' they are serving ';
                    for(var item in foodItems)
                    {
                        say = say + foodItems[item] + ', '
                    }
                }

                this.emit(':ask', say, 'try again');
            });
        }
        else if (foodType !== undefined && myLocation === undefined)
        {
            // specific time given, but location is not given
            say = 'What dining hall would you like to eat at for ' + foodType + '? Please repeat you request with the name of a dining hall. Some options include Case, Brody, and Wilson.'
            this.emit(':ask', say, 'try again');
        }
    },
    'WhereIntent': function() 
    {
        var myLocation = this.event.request.intent.slots.Locations.value.toLocaleLowerCase();
        var say = '';
        if (myLocation === undefined)
        {
            say = 'Dorm halls that have food include: Brody, Akers, Holmes, Riverwalk, Shaw, Snyder-Phillips, Landon, Case, Holden, Wilson.';
            this.emit(':ask', say, 'try again');
        }
        else if (myLocation !== undefined)
        {
            this.emit(":ask", myLocation + "is located at " + cafeLocations[myLocation], "try again");
        }
    },
 
    'MyNameIsIntent': function() 
    {

        var myName = this.event.request.intent.slots.myName.value;
        var say = "";

        if (myName == null) { // no slot
            say = 'You can tell me your name, for example, you can say my name is Natasha.';
        } else {
            // create and store session attributes
            this.attributes['myName'] = myName;
            say = 'Hi ' + myName + '!';
        }

        this.emit(':ask', say, 'try again');
    },
    'RecapIntent': function() 
    {

        // create and store session attributes
        if (!this.attributes['myList']) {
            this.attributes['myList'] = [];  // empty array
        }

        var stateList  = this.attributes['myList'].toString();  // add array element
        var stateCount =  this.attributes['myList'].length;

        var say = 'Your list has the following ' + stateCount + ' states. ' + stateList;

        this.emit(':ask', say, 'try again');
    },

    'AMAZON.HelpIntent': function () 
    {
        this.emit(':ask', 'Say the name of a dining hall and, optionally, for what meal you want to eat.', 'try again');
    },

    'AMAZON.StopIntent': function () 
    {
        var say = '';
        var myName = '';
        if (this.attributes['myName'] ) 
        {
            myName = this.attributes['myName'];
        }
        say = 'Goodbye, ' + myName;

        this.emit(':tell', say );
    }
}

exports.handler = function(event, context, callback)
{

    var alexa = Alexa.handler(event, context);
    // alexa.appId = "amzn1.echo-sdk-ams.app.8c97fc78-342a-4e4f-823b-e2f91e7f3474";
    alexa.registerHandlers(handlers);
    alexa.execute();

};