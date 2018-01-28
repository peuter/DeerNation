/**
 * iCal importer. Parses ICS files from path or URL and saves the events in the database.
 *
 * @author tobiasb
 * @since 2018
 */
const iCal = require('ical')
const logger = require('../logger')(__filename)

class ICal {

  constructor(file, model) {
    this.__uri = file
    this.__parsedData = null
    this.__model = model
  }

  parse() {
    if (this.__uri.startsWith("http")) {
      this.__parsedData = iCal.fromURL(this.__uri)
    } else {
      this.__parsedData = iCal.parseFile(this.__uri)
    }
  }

  update() {
    logger.info('update iCal events from %s', this.__uri)
    this.parse()
    let now = new Date()

    for (let k in this.__parsedData) {
      if (this.__parsedData.hasOwnProperty(k)) {
        let ev = this.__parsedData[k]
        if (ev.type === 'VEVENT' && ev.start >= now) {
          // console.log(ev)
          let event = {
            id: ev.uid,
            start: ev.start,
            end: ev.end,
            location: ev.location,
            title: ev.summary,
            content: ev.description,
            categories: ev.categories
          }
          if (ev.hasOwnProperty('organizer')) {
            let orga = ev.organizer.params.CN.trim()
            if (ev.organizer.val) {
              orga += " "+ev.organizer.val.trim()
            }
            if (orga.endsWith(":")) {
              orga = orga.substring(0, orga.length-1)
            }
            orga = orga.substring(1, orga.length-1)
            event.organizer = orga
          }

          this.__model.Event.save(event, {conflict: 'update'})
        }
      }
    }
  }
}

module.exports = ICal