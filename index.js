/* Description:
 *   Scrapes Google Photo Albums into a list of URLs and displays them using Slideshowify
 *
 * Dependencies:
 *   none
 *
 *
 * Author:
 *    momo-the-monster
 */
 
 const gphotos = require('./gphotos');

module.exports = function(corsica) {
	
  // Transform google photo albums into SlideShowify pages

  corsica.on('gphotos', function(content) {
    if (content.url === undefined) return;

    gphotos.makePage(content.url, (html)=>{
        
        // send back page as html content
        corsica.sendMessage('content', {
            type: 'html',
            content: html,
            screen: content.screen
        });
        
        // return content for the sake of other chained plugins
        return content;

    });

  });
  
}