/**
 * Generates a table with statistics about abuse filters
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/AbuseFilterStats.js]] ([[File:User:Helder.wiki/Tools/AbuseFilterStats.js]])
 */
/*jshint browser: true, camelcase: false, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, trailing: true, laxbreak: true, devel: true, maxlen: 120, evil: true, onevar: true */
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';

mw.messages.set( {
	'afs-filter-page' : 'Especial:Filtro de abusos/$1',
	'afs-missing-filter-version': 'Não foi possível encontrar a versão do filtro $1 correspondente ao log $2.',
	'afs-invalid-month': 'Operação cancelada! O mês fornecido não é válido.',
	'afs-month-question': 'Deseja obter as estatísticas referentes a que mês?' +
		' (forneça um número natural de 1 a 12)',
	'afs-link': 'Estatísticas dos filtros',
	'afs-link-description': 'Gerar uma tabela com estatísticas sobre os filtros de edição',
	'afs-missing-filter-revisions': 'Não foram encontradas revisões do filtro $1',
	'afs-header-template': 'Predefinição:Lista de falsos positivos (cabeçalho)',
	'afs-template-regex': '\\{\\{[Aa]ção *\\|[^}]*(?:1 *= *)?$1[^}]*\\}\\}',
	'afs-error-regex': 'erro *= *sim',
	'afs-result-intro': 'O código da tabela atualizada é apresentado abaixo:',
	'afs-analysis-link': '[[WP:Filtro de edições/Análise/Filtro $1|$2]]',
	'afs-analysis-page-regex': 'Wikipédia:Filtro de edições/Análise/Filtro (\\d+)',
	'afs-table-yes': '{' + '{Tabela-sim}}',
	'afs-table-no': '{' + '{Tabela-não}}',
	'afs-table-header': 'Controle de qualidade dos filtros de edição',
	'afs-table-filter': 'Filtro',
	'afs-table-date': 'Data',
	'afs-table-description': 'Descrição',
	'afs-table-settings': 'Configurações do filtro',
	'afs-table-hits': 'Total',
	'afs-table-hits-text': 'Número de registros',
	'afs-table-disallow': 'Impedir',
	'afs-table-warn': 'Avisar',
	'afs-table-tag': 'Etiquetar',
	'afs-table-total': 'Total',
	'afs-table-warnings': 'Avisos<br />enviados',
	'afs-table-saved-text': 'Edições salvas',
	'afs-table-checked-text': 'Ações conferidas',
	'afs-table-saved': 'Total',
	'afs-table-saved-percent': '% dos<br />registros',
	'afs-table-checked': 'Total',
	'afs-table-checked-percent': '% dos<br />registros',
	'afs-table-false-positives-text': 'Falsos positivos',
	'afs-table-false-positives': 'Total',
	'afs-table-false-positives-percent': '% dos<br />conferidos',
	'afs-table-false-positives-percent-max': '% máximo',
	'afs-saved-note': 'Não apagadas? Vide página discussão.',
	'afs-getting-filter-list': 'Consultando a lista de filtros...',
	'afs-getting-data': 'Obtendo dados...',
	'afs-getting-filter-revisions' : 'Obtendo as versões do filtro $1...',
	'afs-getting-old-revision-info' : 'Obtendo informações sobre a versão $1 do filtro $2...',
	'afs-getting-verification-pages': 'Obtendo os registros analisados...',
	'afs-getting-logs': 'Obtendo os registros do mês escolhido...'
} );

var api, newStats, d, month, firstDayOfSelectedMonth, lastDayOfSelectedMonth, lastDayOfCurrentMonth,
	emptyRow = {
		id: 0,
		description: '',
		actions: '',
		// enabled: '',
		// private: undefined,
		// deleted: undefined,
		hitsInPeriod: 0,
		warnings: 0,
		savedEdits: 0,
		checked: 0,
		errors: 0,
		analysisText: '',
		timestamp: '',
		// date: undefined,
		version: ''
	};

function removeSpinner() {
	$.removeSpinner( 'spinner-filter-stats' );
}

function printTable( table ){
	var $target, i, row, checked, errors, hits, id, ts, offset,
		pad = function( n ){
			return n < 10 ? '0' + n : n;
		},
		tableId = 'af-stats-' + d.getFullYear() + '-' + pad( month ),
		wikicode = [
			'{| id="' + tableId + '" class="wikitable sortable plainlinks"',
			'|+ ' + mw.msg( 'afs-table-header' ),
			'|-',
			'! rowspan=4 data-sort-type="number" | ' + mw.msg( 'afs-table-filter' ),
			// TODO: use data-sort-type="isoDate", once [[bugzilla:52842]] is fixed
			'! rowspan=4 style="width: 9em;" | ' + mw.msg( 'afs-table-date' ),
			'! rowspan=4 data-sort-type="text" | ' + mw.msg( 'afs-table-description' ),
			'! colspan=3 | ' + mw.msg( 'afs-table-settings' ),
			'! colspan=8 | ' + mw.msg( 'afs-table-hits-text' ),
			'|-',
			'! rowspan=3 data-sort-type="text" | ' + mw.msg( 'afs-table-disallow' ),
			'! rowspan=3 data-sort-type="text" | ' + mw.msg( 'afs-table-warn' ),
			'! rowspan=3 data-sort-type="text" | ' + mw.msg( 'afs-table-tag' ),
			'! rowspan=3 data-sort-type="number" | ' + mw.msg( 'afs-table-hits' ),
			'! rowspan=3 data-sort-type="number" | ' + mw.msg( 'afs-table-warnings' ),
			'! colspan=2 | ' + mw.msg( 'afs-table-saved-text' ) + '<ref name="saved" />',
			'! colspan=4 | ' + mw.msg( 'afs-table-checked-text' ),
			'|-',
			'! rowspan=2 data-sort-type="number" | ' + mw.msg( 'afs-table-saved' ),
			'! rowspan=2 data-sort-type="number" | ' + mw.msg( 'afs-table-saved-percent'),
			'! rowspan=2 data-sort-type="number" | ' + mw.msg( 'afs-table-checked' ),
			'! rowspan=2 data-sort-type="number" | ' + mw.msg( 'afs-table-checked-percent'),
			'! colspan=2 | ' + mw.msg( 'afs-table-false-positives-text' ),
			'|-',
			'! data-sort-type="number" | ' + mw.msg( 'afs-table-false-positives' ),
			'! data-sort-type="number" | ' + mw.msg( 'afs-table-false-positives-percent' ) /*,
			'! data-sort-type="number" | ' + mw.msg( 'afs-table-false-positives-percent-max' ) */
		].join( '\n' );
	/*
	table.sort( function( a, b ) {
		return b.hitsInPeriod - a.hitsInPeriod;
	} );
	*/
	for ( i = 0; i < table.length; i++ ){
		row = table[i];
		if ( lastDayOfSelectedMonth < row.date ){
			// This filter didn't exist on the selected month
			// (or it is very old and its only logs are from after the selected month)
			continue;
		}
		id = row.id;
		ts = row.timestamp;
		hits = row.hitsInPeriod;
		checked = row.checked;
		errors = row.errors;
		offset = row.date && ( row.date > firstDayOfSelectedMonth ) ?
			row.date : firstDayOfSelectedMonth;
		offset = [
			offset.getUTCFullYear(),
			pad( offset.getUTCMonth() + 1 ),
			pad( offset.getUTCDate() ),
			pad( offset.getUTCHours() ),
			pad( offset.getUTCMinutes() ),
			pad( offset.getUTCSeconds() )
		].join( '' );
		wikicode += '\n|-\n| ' + [
			'[[Special:AbuseFilter/' + id + '|' + id + ']]',
			row.version ?
				'[[Special:AbuseFilter/history/' + id + '/item/' + row.version + '|' + ts + ']]' :
				'[[Special:AbuseFilter/history/' + id + '|?]]<sup>[[bugzilla:52919|bug]]</sup>',
			row.version ?
				row.description :
				'? <sup>[[bugzilla:52919|bug]]</sup>',
			row.version ?
				( row.actions.indexOf( 'disallow' ) !== -1 ?
					mw.message( 'afs-table-yes' ).plain() :
					mw.message( 'afs-table-no' ).plain()
				) :
				'? <sup>[[bugzilla:52919|bug]]</sup>',
			row.version ?
				( row.actions.indexOf( 'warn' ) !== -1 ?
					mw.message( 'afs-table-yes' ).plain() :
					mw.message( 'afs-table-no' ).plain()
				) :
				'? <sup>[[bugzilla:52919|bug]]</sup>',
			row.version ?
				( row.actions.indexOf( 'tag' ) !== -1 ?
					mw.message( 'afs-table-yes' ).plain() :
					mw.message( 'afs-table-no' ).plain()
				) :
				'? <sup>[[bugzilla:52919|bug]]</sup>',
			'[' + mw.config.get( 'wgServer' ) +
				mw.util.wikiGetlink( 'Special:AbuseLog' ) + '?' +
				$.param( {
					dir: 'prev',
					wpSearchFilter: id,
					offset: offset,
					limit: hits
				} ) + ' ' + hits + ']',
			row.warnings,
			row.savedEdits,
			hits === 0
				? '-'
				: ( 100 * row.savedEdits / hits ).toFixed( 1 ) + '%',
			mw.msg( 'afs-analysis-link', id, checked ),
			hits === 0
				? '-'
				: ( 100 * checked / hits ).toFixed( 1 ) + '%',
			errors === undefined
				? '-'
				: errors,
			errors === undefined || checked === 0
				? '-'
				: ( 100 * errors / checked ).toFixed( 1 ) + '%' /*,
			errors === undefined || hits === 0
				? '-'
				: ( 100 * (errors + hits - checked) / hits ).toFixed( 1 ) + '%' */
		].join( '\n| ' );
	}
	wikicode += '\n|}\n' + [
		'<references>',
		'<ref name="saved">' + mw.msg( 'afs-saved-note' ) + '</ref>',
		'</references>'
	].join('\n');

	$target = $( '#abuse-filter-stats-result' );
	if ( !$target.length ){
		$target = $( '<div id="abuse-filter-stats-result">' ).prependTo( '#mw-content-text' );
	}
	$target.empty().append(
		'<b>' + mw.msg( 'afs-result-intro' ) + '</b><br /><br />' +
		'<textarea cols="80" rows="10" style="width: 100%; font-family: monospace; line-height: 1.5em;">' +
			mw.html.escape( wikicode ) +
		'</textarea>'
	);
	$.removeSpinner( 'spinner-filter-stats' );
	// $( 'table.sortable' ).tablesorter();
}

function generateAbuseFilterStats(){
	var param, getLog;

	getLog = function( queryContinue ){
		if( queryContinue ){
			$.extend( param, queryContinue );
		}
		api.get( param )
		.done( function ( data ) {
			var i, log, row, logId, analysis, filterInfo, logDate,
				reError = new RegExp( mw.message( 'afs-error-regex' ).plain() );
			for ( i = 0; i < data.query.abuselog.length; i++ ){
				log = data.query.abuselog[i];
				logDate = new Date ( log.timestamp );
				logId = parseInt( log.filter_id, 10 );
				// Find the row of the newest version of the
				// filter which generated this log
				// which is older than the log
				for ( row = 0; row < newStats.length; row++ ) {
					if ( newStats[ row ].id === logId ) {
						break;
					}
				}
				for ( ; row < newStats.length; row++ ) {
					if ( newStats[ row ].date < logDate || newStats[ row ].id !== logId ) {
						break;
					}
				}
				if( ( row === newStats.length || newStats[ row ].id !== logId ) ){
					// FIXME: Find a way to determine the filter version!
					if( newStats[ row - 1 ].timestamp ){
						newStats.splice( row, 0, $.extend( {},
							emptyRow,
							{ id: logId }
						) );
					} else {
						row = row - 1;
					}
					// console.warn( mw.msg( 'afs-missing-filter-version', log.filter_id, log.id ) );
					// continue;
				}
				filterInfo = newStats[ row ];
				filterInfo.hitsInPeriod += 1;
				analysis = filterInfo.analysisText
					.match( new RegExp( mw.message( 'afs-template-regex', log.id ).plain() ) );
				if ( analysis ){
					filterInfo.checked += 1;
					if ( reError.test( analysis[0] ) ){
						filterInfo.errors += 1;
					}
				}
				// TODO: Make sure this is the correct meaning!
				if ( log.revid !== undefined ){
					filterInfo.savedEdits += 1;
				}
				if ( log.result.indexOf( 'warn' ) !== -1 ){
					filterInfo.warnings += 1;
				}
			}
			if( data[ 'query-continue' ] ){
				getLog( data[ 'query-continue' ].abuselog );
			} else {
				printTable( newStats );
			}
		} )
		.fail( removeSpinner );
	};
	param = {
		list: 'abuselog',
		afllimit: 'max',
		// aflfilter: 123,
		aflstart: firstDayOfSelectedMonth.toISOString(), //FIXME?
		aflend: lastDayOfSelectedMonth.toISOString(),
		aflprop: 'ids|revid|result|timestamp', // |filter|user|title|action|hidden|details|ip
		afldir: 'newer'
	};
	mw.notify(
		mw.msg( 'afs-getting-logs' ),
		{
			tag: 'stats',
			title: mw.msg( 'afs-getting-data' )
		}
	);
	getLog();
}

function getVerificationPages(){
	mw.notify(
		mw.msg( 'afs-getting-verification-pages' ),
		{
			tag: 'stats',
			title: mw.msg( 'afs-getting-data' )
		}
	);
	api.get( {
		action: 'query',
		prop: 'revisions',
		rvprop: 'content',
		generator: 'embeddedin',
		geititle: mw.msg( 'afs-header-template' ),
		geinamespace: 4,
		geilimit: 'max'
	} )
	.done( function ( data ) {
		$.each( data.query.pages, function(id){
			var i, filter = data.query.pages[ id ].title
				.match( mw.msg( 'afs-analysis-page-regex' ) );
			if( filter && filter[1] ){
				filter = parseInt( filter[1], 10 );
				for ( i = 0; i < newStats.length; i++ ) {
					if ( newStats[ i ].id === filter ) {
						// TODO: Consider spliting the verification pages by filter revision?
						newStats[ i ].analysisText =
							data.query.pages[ id ].revisions[0]['*'];
					}
				}
			}
		} );
		generateAbuseFilterStats();
	} )
	.fail( removeSpinner );
}

function getOldFilterInfo( from ) {
	var i;
	for ( i = from; i < newStats.length; i++ ){
		if( !newStats[i].isLatestVersion && newStats[i].id && newStats[i].version ){
			break;
		}
	}
	if( i === newStats.length ){
		getVerificationPages();
		return;
	}
	mw.notify(
		mw.msg( 'afs-getting-old-revision-info', newStats[i].version, newStats[i].id ),
		{
			tag: 'stats',
			title: mw.msg( 'afs-getting-data' )
		}
	);
	$.ajax( {
		url: mw.util.wikiGetlink(
			'Special:AbuseFilter/history/' + newStats[i].id +
				'/item/' + newStats[i].version
		) + '?uselang=qqx'
	} )
	.done( function( data ){
		var $data = $( data );
		newStats[i].description = $data.find( '#mw-abusefilter-edit-description' )
			.find( '.mw-input input' )
			.val();
		newStats[i].actions = [];
		if( $data.find( '#mw-abusefilter-action-checkbox-disallow' ).is(':checked') ){
			newStats[i].actions.push( 'disallow' );
		}
		if( $data.find( '#mw-abusefilter-action-checkbox-warn' ).is(':checked') ){
			newStats[i].actions.push( 'warn' );
		}
		if( $data.find( '#mw-abusefilter-action-checkbox-tag' ).is(':checked') ){
			newStats[i].actions.push( 'tag' );
		}
		newStats[i].actions = newStats[i].actions.join( ',' );
		getOldFilterInfo( i + 1 );
	} )
	.fail( function(){
		console.log( 'ajax error: ', arguments );
		removeSpinner();
	} );
}

function getFilterList(){
	var filters, cur, getRevisionsOfFilter, oldLogs,
		filterRevisions = {};

	getRevisionsOfFilter = function ( id, queryContinue ){
		var param = {
			action: 'query',
			list: 'logevents',
			leaction: 'abusefilter/modify',
			// lestart: lastDayOfSelectedMonth.toISOString(), // lastDayOfCurrentMonth.toISOString(),
			// leend: firstDayOfSelectedMonth.toISOString(),
			leprop: 'timestamp|details',
			letitle: mw.msg( 'afs-filter-page', id ),
			ledir: 'older',
			// TODO: Get statistics to improve this limit?
			// What is the average number of changes/filter/month?
			lelimit: 7 // 'max'
		};

		if( queryContinue ){
			$.extend( param, queryContinue );
		}

		api.get( param )
		.done( function ( data ) {
			var i, logDate, curFilterRevs, rev, r,
				changes = data.query.logevents;
			// From the newer to the oldest log
			for ( i = 0; i < changes.length; i++ ){
				logDate = new Date ( changes[i].timestamp );
				curFilterRevs = filterRevisions[ changes[i]['1'] ];
				rev = {
					timestamp: changes[i].timestamp,
					date: new Date ( changes[i].timestamp ),
					version: changes[i]['0'],
					isLatestVersion: !curFilterRevs.length
				};
				if ( lastDayOfSelectedMonth < logDate ){
					// The oldest change made after the selected month
					// (if it exists) will be the first in the list
					curFilterRevs[0] = rev;
				} else if ( firstDayOfSelectedMonth <= logDate ){
					// Change made during the selected month
					// push and continue
					if( curFilterRevs.length && lastDayOfSelectedMonth < curFilterRevs[0].date ){
						curFilterRevs[0] = rev;
					} else {
						curFilterRevs.push( rev );
					}
				} else if ( ! curFilterRevs.length
					// In the unlikely event that a log was made exactly in the beggining of the month,
					// there is no need for a log from the previous month
					|| firstDayOfSelectedMonth !== curFilterRevs[0].date
				){
					// Latest change made before the selected month
					// push this log and ignore the next logs
					if( curFilterRevs.length && lastDayOfSelectedMonth < curFilterRevs[0].date ){
						curFilterRevs[0] = rev;
					} else {
						curFilterRevs.push( rev );
					}
					break;
				}
			}
			// logDate = new Date ( changes[ changes.length - 1 ].timestamp );
			if ( firstDayOfSelectedMonth <= logDate && data[ 'query-continue' ] ){
				console.log( 'getRevisionsOfFilter: ' + id );
				if ( oldLogs ){
					data[ 'query-continue' ].logevents.letitle = 'Special:AbuseFilter/' + id;
				}
				getRevisionsOfFilter( id, data[ 'query-continue' ].logevents );
				return;
			}
			// The current log is:
			// * Not defined; or
			// * From before the selected month; or
			// * The oldest log available for this title (be aware of [[bugzilla:52919]])
			if (
				!oldLogs
				&& (
					!changes.length
					|| (
						firstDayOfSelectedMonth <= logDate
						&& ! data[ 'query-continue' ]
					)
				)
			) {
				// Workaround for [[bugzilla:52221]]
				console.log( 'getRevisionsOfFilter: ' + id + ' (old logs)');
				oldLogs = true;
				getRevisionsOfFilter( id, {
					lestart: lastDayOfSelectedMonth.toISOString(), // lastDayOfCurrentMonth.toISOString(),
					letitle: 'Special:AbuseFilter/' + id
				} );
				return;
			}
			cur++;
			if( cur < filters.length ){
				console.log( 'getRevisionsOfFilter: ' + filters[ cur ].id );
				oldLogs = false;
				mw.notify(
					mw.msg( 'afs-getting-filter-revisions', filters[ cur ].id ),
					{
						tag: 'stats',
						title: mw.msg( 'afs-getting-data' )
					}
				);
				getRevisionsOfFilter( filters[ cur ].id );
				return;
			}
			// TODO: Make sure revisions are sorted from newest to oldest?
			// for ( i = 1; i <= filters.length; i++ ){
				// filterRevisions[ i ].sort( function( a, b ) {
					// return ( new Date ( a.timestamp ) ) - ( new Date ( b.timestamp ) );
				// } );
			// }
			newStats = [];
			for ( i = 0; i < filters.length; i++ ){
				curFilterRevs = filterRevisions[ filters[i].id ];
				if( !curFilterRevs.length ){
					// This might happens because of [[bugzilla:52919]]
					console.warn( mw.msg( 'afs-missing-filter-revisions', filters[i].id ) );
				}
				/*
				// && curFilterRevs.length === 1
				else if ( lastDayOfSelectedMonth < curFilterRevs[0].date ){
					// Do not add this filter to the table, since
					// it was created after the selected month
					// FIXME: the filter might be very old and
					// its only logs are from after the selected month,
					// due to [[bugzilla:52919]]
					continue;
				}
				*/
				for ( r = 0; r < curFilterRevs.length; r++ ){
					newStats.push(
						$.extend( {},
							emptyRow,
							curFilterRevs[ r ],
							curFilterRevs[ r ].isLatestVersion ?
								filters[i] :
								{
									id: filters[i].id
								}
						)
					);
				}
			}
			getOldFilterInfo(0);
		} )
		.fail( removeSpinner );
	};

	$( '#firstHeading' ).injectSpinner( 'spinner-filter-stats' );
	mw.notify( mw.msg( 'afs-getting-filter-list' ), { tag: 'stats', title: mw.msg( 'afs-getting-data' ) } );

	api = new mw.Api();
	api.get( {
		action: 'query',
		list: 'abusefilters',
		abflimit: 'max',
		abfprop: 'id|description|actions|status|private'
	} )
	.done( function ( data ){
		var i;
		filters = data.query.abusefilters;
		for ( i = 0; i < filters.length; i++ ){
			filterRevisions[ filters[ i ].id ] = [];
		}
		cur = 0;
		console.log( 'getRevisionsOfFilter: ' + filters[ cur ].id );
		oldLogs = false;
		mw.notify(
			mw.msg( 'afs-getting-filter-revisions', filters[ cur ].id ),
			{
				tag: 'stats',
				title: mw.msg( 'afs-getting-data' )
			}
		);
		getRevisionsOfFilter( filters[ cur ].id );
	} )
	.fail( removeSpinner );
}

function addAbuseFilterStatsLink(){
	$( mw.util.addPortletLink(
		'p-cactions',
		'#',
		mw.msg( 'afs-link' ),
		'ca-AbuseFilterStatsLink',
		mw.msg( 'afs-link-description' )
	) ).click( function( e ){
		e.preventDefault();
		d = new Date();
		month = prompt( mw.msg( 'afs-month-question' ), d.getMonth() + 1 );
		if ( month === null ){
			return;
		}
		month = parseInt( month, 10 );
		if ( isNaN( month ) || month < 1 || 12 < month ){
			alert( mw.msg( 'afs-invalid-month' ) );
			return;
		}

		firstDayOfSelectedMonth = new Date( Date.UTC(d.getFullYear(), month - 1, 1) );
		// end of the selected month
		lastDayOfSelectedMonth = new Date( Date.UTC(d.getFullYear(), month, 0, 23, 59, 59) );
		// end of the first week of the selected month
		// lastDayOfSelectedMonth = new Date( Date.UTC(d.getFullYear(), d.getMonth(), 7, 23, 59, 59) );

		// last day of the current month
		lastDayOfCurrentMonth = new Date( Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) );
		mw.loader.using( [
			'mediawiki.api',
			'jquery.spinner',
			'jquery.mwExtension',
			'mediawiki.notify',
			'mediawiki.notification'
		], getFilterList );
	} );
}

if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'AbuseFilter'
	|| ( mw.config.get( 'wgDBname' ) === 'ptwiki'
		&& mw.config.get( 'wgPageName' ).indexOf( 'Wikipédia:Filtro_de_edições' ) === 0
	)
) {
	$( addAbuseFilterStatsLink );
}

}( mediaWiki, jQuery ) );