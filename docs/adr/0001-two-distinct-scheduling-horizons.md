# Two distinct scheduling horizons for Host and Visitor

The Host can plan availability further ahead than a Visitor can book. The Host's
planning horizon is the current week plus four more (five weeks); the Visitor's
booking horizon is the current week plus two more (three weeks). Both are
Monday-anchored and roll forward each day.

These model different concerns: the Host horizon is *planning* (how far ahead the
Host maps out openings), while the Visitor horizon is a *booking policy* (how far
ahead strangers may reserve). Slots the Host has opened beyond the Visitor horizon
exist but are not yet offered for booking; they become bookable as the rolling
window advances.
