
flowplayer(function(player, root, engine) {

   var track = $("track", root),
      conf = player.conf;

   if (flowplayer.support.subtitles) {

      player.subtitles = track.length && track[0].track;

      // use native when supported
      if (conf.nativesubtitles && conf.engine == 'html5') return;
   }

   // avoid duplicate loads
   track.remove();

   var TIMECODE_RE = /^([0-9]{2}:[0-9]{2}:[0-9]{2}[,.]{1}[0-9]{3}) --\> ([0-9]{2}:[0-9]{2}:[0-9]{2}[,.]{1}[0-9]{3})(.*)/;

   function seconds(timecode) {
      var els = timecode.split(':');
      if (els.length == 2) els.unshift(0);
      return els[0] * 60 * 60 + els[1] * 60 + parseFloat(els[2].replace(',','.'));
   }

   player.subtitles = [];

   function parseSubtitles(txt) {

      for (var i = 0, lines = txt.split("\n"), len = lines.length, entry = {}, title, nextTitle, line, timecode, text, cue; i < len; i++) {

         timecode = TIMECODE_RE.exec(lines[i]);

         if (timecode) {

            // title
            title = lines[i - 1];

            // next item's title
            nextTitle = parseInt(title) + 1;

            // text
            text = "<p>" + lines[++i] + "</p><br/>";
            while ((line = lines[++i]) && $.trim(line) && nextTitle != line.split(' ')[0] && i < lines.length) text +=  "<p>" + line + "</p><br/>";

            // entry
            entry = {
               title: title,
               startTime: seconds(timecode[1]),
               endTime: seconds(timecode[2] || timecode[3]),
               text: text
            };

            cue = { time: entry.startTime, subtitle: entry };

            player.subtitles.push(entry);
            player.cuepoints.push(cue);
            player.cuepoints.push({ time: entry.endTime, subtitleEnd: title });

            // initial cuepoint
            if (entry.startTime === 0) {
               player.trigger("cuepoint", cue);
            }

         }

      }

   }

   var url = track.attr("src");
   var contents = track.attr('contents');
   if (contents) {
      // First check for inline subtitles
      parseSubtitles(contents);
   } else if (url) {
      // Otherwise load from network
      setTimeout(function() {
         $.get(url, parseSubtitles).fail(function() {
            player.trigger("error", {code: 8, url: url });
            return false;
         });
      });
   }

   var wrap = $("<div class='fp-subtitle'/>").appendTo(root),
      currentPoint;

   player.bind("cuepoint", function(e, api, cue) {

      if (cue.subtitle) {
         currentPoint = cue.index;
         wrap.html(cue.subtitle.text).addClass("fp-active");

      } else if (cue.subtitleEnd) {
         wrap.removeClass("fp-active");
         currentPoint = cue.index;
      }

   }).bind("seek", function(e, api, time) {
      // Clear future subtitles if seeking backwards
      if (currentPoint && player.cuepoints[currentPoint] && player.cuepoints[currentPoint].time > time) {
         wrap.removeClass('fp-active');
         currentPoint = null;
      }
      $.each(player.cuepoints || [], function(i, cue) {
         var entry = cue.subtitle;
         //Trigger cuepoint if start time before seek position and end time nonexistent or in the future
         if (entry && currentPoint != cue.index) {
            if (time >= cue.time && (!entry.endTime || time <= entry.endTime)) player.trigger("cuepoint", cue);
         } // Also handle cuepoints that act as the removal trigger
         else if (cue.subtitleEnd && time >= cue.time && cue.index == currentPoint + 1) player.trigger("cuepoint", cue);
      });

   }).bind("fullscreen", function(e) {
      wrap.css('font-size', screen.width / root[0].offsetWidth * 1.4 * 100 + '%');

   }).bind("fullscreen-exit", function(e) {
      wrap.css('fontSize', '');

   });

   player.loadSubtitles = function(contents) {
      player.subtitles = [];
      player.cuepoints = [];
      parseSubtitles(contents);
      return player;
   };

});


