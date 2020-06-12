
// const xhr = new XMLHttpRequest();
// xhr.onreadystatechange((data)=>{
// 		// Error
// 		$('#indiegala-helper-coins').text('error');
//
// 		// Success
// 		if (data.status === 'ok'){
// 			$('#indiegala-helper-coins strong').text(data.silver_coins_tot);
// 		} else {
// 			$('#indiegala-helper-coins').text(data.status.replace('_', ' '));
// 		}
// });
// xhr.open('GET', 'https://www.indiegala.com/get_user_info');
// xhr.send();

function updateGalaSilver(amount = undefined){
	console.log(amount);
	if (amount == undefined) {
		$.ajax({
			type: 'GET',
			url: 'https://www.indiegala.com/get_user_info',
			data: {
				'uniq_param': new Date().getTime(),
				'show_coins': 'True'
			},
			cache: false,
			dataType: 'json',
			success: function(data){
				if (data.status === 'ok'){
					$('.coins-amount').text(data.silver_coins_tot);
				} else {
					$('.coins-amount').text(data.status.replace('_', ' '));
				}
			},
			error: function(xhr, ajaxOptions, thrownError){
				$('.coins-amount').text('error');
			}
		});
	} else {
		$('.coins-amount').text(amount);
	}
}
get_user_level();

// Mark owned games as owned || remove owned games from list || remove hidden apps
function showOwnedGames(){
	// Remove Entered Giveaways
	if (!!settings.hide_entered_giveaways){
		// $('.items-list-item.wait').remove();
	}

	$('.tickets-col:not(.checked)').each(function(){
		let app_id = Number($('.giveaway-game-id', this).val()) || 0;
		let app_image = $('img', this);
		let app_name = app_image.attr('alt');
		let giveaway_guaranteed = ($('.type-level-cont', this).text().match(/((not\s)?guaranteed)/i) || [0])[0] == 'guaranteed';
		let giveaway_level = Number(($('.type-level-cont', this).text().match('[0-9]+') || [0])[0]);
		let giveaway_participants = Number(($('.box_pad_5', this).text().match(/([0-9]+) participants/i) || [0,0])[1]);
		let giveaway_price = Number($('.ticket-price strong', this).text()) || 0;
		let giveaway_extra_odds = !!($('.extra-type', this).text().match(/extra odds/i) || [0])[0];
		let do_not_remove = !!settings.always_show_guaranteed && !!giveaway_guaranteed; // Keep if guaranteed

		if ( !do_not_remove && (
			typeof local_settings.blacklist_apps[app_id] != 'undefined' // Remove If Blacklisted
          || !!settings.hide_not_guaranteed && !giveaway_guaranteed // Remove if "not guaranteed"
          || !!settings.hide_high_level_giveaways && giveaway_level > settings.current_level // Remove if above users level
          || !!settings.hide_extra_odds && !!giveaway_extra_odds // Remove if "extra odds"
          || !!settings.hide_above_price && giveaway_price > settings.hide_above_price // Remove if above defined price
          || !!settings.hide_above_participants && giveaway_participants > settings.hide_above_participants // Remove if above defined participants
          || !!settings.hide_soundtracks && !!(app_name.toLowerCase().indexOf('soundtrack') + 1) // Remove If Soundtrack
          || !!settings.hide_owned_games && !!($.inArray(app_id, local_settings.owned_apps) + 1) // Remove if owned
		)
		){
			$(this).remove();
			return;
		}

		// Add class if above users level
		if (giveaway_level > settings.current_level){
			$(this).addClass('higher-level');
		}

		// Add class If Owned
		if ( !!($.inArray(app_id, local_settings.owned_apps) + 1) ){
			$(this).addClass('owned');
		}

		// Add link to steam store page
		$('.info-row', this).eq(2).html(`<i class="fa fa-steam" aria-hidden="true"></i> <a class="viewOnSteam" href="http://store.steampowered.com/app/${app_id}" target="_BLANK">View on Steam &rarr;</a>`);

		// Disable indiegala entry function on main page with `ajaxNewEntrySemaphore=false;` so it uses our function
		$('.items-list-item-ticket-click', this).attr('onclick','joinGiveawayOrAuctionAJS=false;');

		// Add button to add to blacklist
		$('.ticket-left', this).prepend('<span class="mark-as-owned"> Add To Blacklist <i class="fa fa-times"></i></span>');

		// Show app image
		app_image.on('error', function(){
			$(this).attr('src','//i.imgur.com/eMShBmW.png');
		}).attr('src', app_image.attr('data-src'));
	});

	// If less than 4 apps on page & inifiniteScroll is enabled then load next page
	$('.tickets-col').not('.checked').addClass('checked').not('.item').fadeIn().length <= 4 && !!settings.infinite_scroll ? nextPage() : $('#indiegala-helper-pageloading').slideUp(() => {loading_page=false;});
}

// Auto enter giveaways
setInterval(() => {
	if (!!page_loaded && !!settings.auto_enter_giveaways){
		if ( Number($('#indiegala-helper-coins strong').html() ) > 0 ){
			$('.tickets-col .animated-coupon').length > 0 ? $('.tickets-col .animated-coupon').eq(0).click() : (!loading_page ? nextPage() : false);
		}
	}
}, 3000);

// Load next page via ajax
function nextPage(){
	loading_page=true;
	var url_address = $('a.prev-next').eq(5).attr('href');
	// If last page or undefined url return
	if (typeof url_address == 'undefined' || url_address == location.pathname){
		$('#indiegala-helper-pageloading').slideUp( () => { loading_page=false; });
		return;
	}

	$('#indiegala-helper-pageloading').slideDown(250);
	var url_attr = url_address.split('/');
	var url = `https://www.indiegala.com/giveaways/ajax_data/list?page_param=${url_attr[2]}&order_type_param=${url_attr[3]}&order_value_param=${url_attr[4]}&filter_type_param=${url_attr[5]}&filter_value_param=${url_attr[6]}`;
	var settings = {
		dataType: 'json',
		processData: false,
		success: function(data){
			if (!data.content){
				nextPage();
				return;
			}
			data = $.parseHTML(data.content);
			$('.tickets-row').append($('.tickets-col', data));
			$('.pagination').parent().html($('.pagination', data));
			history.replaceState('data', '', `https://www.indiegala.com${url_address}`);
			showOwnedGames();
		},
		error: () => { nextPage(); }
	};
	$.ajax(url,settings);
}

// Set loading page as true, will be set to false once "showOwnedGames" is processed
var loading_page = true;
var page_loaded = false;

// Wait until indiegala loads the initial giveaways
var wait_for_page = setInterval(() => {
	if($('[href^="/giveaways/card"]').length >= 1){
		clearInterval(wait_for_page);
		page_loaded = true;
		// // Remove Indiegalas "Owned Games" overlay
		// $('.on-steam-library-text').remove();

		// Add coin balance display to side of screen
		$('body').append('<div id="indiegala-helper-coins" title="IndieGala Coin Balance"><strong class="coins-amount"><i class="fa fa-spinner fa-spin"></i></strong><span> <img src="/img/gala-silver.png"/></span></div>');
		$('#galasilver-amount').addClass('coins-amount');
		// Update current coin balance
		updateGalaSilver();
		// // Add infinite page loading spinner
		$('.page-contents-list-cont .page-contents-list').after('<i class="fa fa-refresh fa-5x fa-spin" id="indiegala-helper-pageloading"></i>');
		// Show page numbers at top & bottom of page
		$('.pagination').parent().parent().clone().insertAfter('.page-contents-list-menu');
		// Show/Remove giveaways based on user settings
		showOwnedGames();
	}
}, 500);

// If infinite scroll is checked then listen to scroll event and load more pages as needed
if (!!settings.infinite_scroll){
	$(window).scroll(function(){
		if (loading_page===false){
			var hT = $('.pagination').eq(1).offset().top,
				hH = $('.pagination').eq(1).outerHeight(),
				wH = $(window).height(),
				wS = $(this).scrollTop();
			if (wS > (hT+hH-wH)){
				nextPage();
			}
		}
	});
}

// Add apps to hidden apps list
$(document).on('click','.mark-as-owned',(e) => {markAsOwned(e.target);/*showOwnedGames();*/});
//$(document).on('click','.items-list-item-ticket-click', (e) => { updateGalaSilver(0); setTimeout(()=>{updateGalaSilver(1)}, 1000); setTimeout(()=>{updateGalaSilver(2)}, 2000); });

// Catch ajax calls, update coins on entry
var open = window.XMLHttpRequest.prototype.open,
    send = window.XMLHttpRequest.prototype.send,
    onReadyStateChange;

function openReplacement(method, url, async, user, password) {
    var syncMode = async !== false ? 'async' : 'sync';
    return open.apply(this, arguments);
}

function sendReplacement(data) {
    if(this.onreadystatechange) this._onreadystatechange = this.onreadystatechange;
    this.onreadystatechange = onReadyStateChangeReplacement;
    return send.apply(this, arguments);
}

function onReadyStateChangeReplacement() {
		console.log(this);
    if (this.readyState == 4 && this.responseURL == 'https://www.indiegala.com/giveaways/join') {
			try {
				json = JSON.parse(this.responseText);
				updateGalaSilver(json.silver_tot);
			}catch(O_o){}
		}
    if(this._onreadystatechange) return this._onreadystatechange.apply(this, arguments);
}

window.XMLHttpRequest.prototype.open = openReplacement;
window.XMLHttpRequest.prototype.send = sendReplacement;
