/*
Скрипт управления типом модального окна для отображения полного дерева объектов
*/

const TypeTreeNode ={ROOT:-1,DB:0,TABLE:1,FIELD:2,BOOK:3,SHEET:4,SQL:5,NAMED_RANGE:6,RANGE_PROP:7,};
const TypeInternalForms={ONE_VERSION:0,TWO_VERSION:1,THREE_VERSION:2};

(function(window, c=undefined){
	var formElement={};//список контролов на форме модального окна с которыми работает jQuery
	var selectedRows=[];
	var reqRes=[]//массив ответов получаемых от ассинхронных обращений к удалённым БД
	var curRes;//объект описания параметров текущего соединений к удалённо БД
	var rootDbNode;//Корневой узел в дереве соединений от которого строятся данные соединений
	var sheetsParentNode;//Корневой узел в дереве соединений для данных об именованных диапазонах 
	var resulRangeFind;//Результат поиска именнованых таблиц в строковом формате, чтобы потом перевести в JSON
	var dbUserName;
	var dbUserPassword;
	var dbUrlReguest;
	var dbSqlReguest;
	var dbSqlFormatAnswer="%20FORMAT%20CSV";
	var dbRequestName='';
	var dbFullSqlReguest;	
	var dbSelectedTable='';

	var currentElementName='';
	var currentElementID=0;
	var currentConnectionName='';
	var currentConnectionID='';
	var currentSpreadShitId='';//id текущей таблицы  для отображения результатов SQL запроса к удаленной БД текущего соединения
	var requestTable=undefined;//текущий объект таблицы для отображения результатов SQL запроса к удаленной БД текущего соединения
	var nameCurrentBook='';
	
	var msgBox=undefined;//jQuery ui dialog объект диагостического сообщения	
	
	var accordionOfQueries=undefined;
	
	var stateObject=undefined;
	var connectionList;//Массив доступных подключений загруженный из localStorage	
	var heightDivAccordion;
	var heightTableInQuery;

	let loader = null;
	var rootNode={};
	iQuery=0;//номер подключения в списке добавляемых подключений
	var queryList=[];//массив всех созданных или загруженных sql запросов для доступных соединений
	queryItem=undefined;//текущий sql запрос
	
	//Базовая функция создания дерева объектов
	function createObjectTree(){				
		curRes=new Object;			
		var stateConnectListStr=localStorage.getItem('xldbFreeStateConnect');//загруженный из localStorage список подключений
		var stateQueryListStr=localStorage.getItem('xldbFreeStateQuery');//загруженный из localStorage список SQL запросов	
		if(stateConnectListStr!=undefined){
			if(stateConnectListStr.length>0){
				stateObject=JSON.parse(stateConnectListStr);
				connectionList=stateObject['connectionList'];
				if(connectionList.length>0){				
					//Создание дерева структур DB для каждого из доступных соединений
					treeDbObject=$("#tree-frame").fancytree({													
						type:TypeTreeNode.ROOT,
						activate:function(event, data){
							if(data.node.type==TypeTreeNode.SQL){
								//$("#btnAddQuery").prop("disabled",false);
								currentConnectionName=data.node.title;
								currentConnectionID="#"+$(data.node.li).attr('id');
							}
							else{
								currentConnectionID='';
								currentConnectionName='';
								//$("#btnAddQuery").prop("disabled",true);
							}
						},
						dblclick: function(event, data) {										
							switch (data.node.type) {
								case TypeTreeNode.SQL:									
									currentConnectionName=data.node.title;								
									currentConnectionID="#"+$(data.node.li).attr('id');
									showNewQueryDialog(currentConnectionID);								
									break;
								case TypeTreeNode.ROOT:
								case TypeTreeNode.DB:
								case TypeTreeNode.BOOK:
								case TypeTreeNode.SHEET:
								case TypeTreeNode.RANGE_PROP:
								case TypeTreeNode.NAMED_RANGE:																
									break;
								case TypeTreeNode.FIELD:
									if(currentElementID>=0){
										let currTXTArrea=document.getElementById('txtSQL'+currentElementID);
										let fields=data.node.title.split('#');
										if(fields.length>0)
											sendFromTreeNodeToSqlEditor(fields[0],currTXTArrea);
									}								
									break;
								default:
									if(currentElementID>=0){
										let currTXTArrea=document.getElementById('txtSQL'+currentElementID);
										sendFromTreeNodeToSqlEditor(data.node.title,currTXTArrea);
									}								
									break;
							};										
						}
					});
					
					$(".fancytree-container").css({"border-width":"0px"});//Убираем некрасивую границу дерева объектов

					rootDbNode = $.ui.fancytree.getTree("#tree-frame").getRootNode();
					clearTableTree(rootDbNode);				

					(async ()=>{
						var j=0;
						connectionList.forEach(item => {
							dbRequestName=item['name'];
							dbUrlReguest=item['url'];
							dbUserName=item['username'];
							dbUserPassword=item['password'];
							
							curRes['name']=dbRequestName;							

							switch (localStorage.getItem('dbType')) {
								case 0:		
								default:
									createLoader();								
									dbSqlReguest="SELECT distinct name value FROM system.tables where engine <> 'View' and database='default'";
									dbSqlReguest.replace(/ /g,"%20");
									dbFullSqlReguest="https://"+dbUrlReguest+"/?user="+dbUserName+"&password="+dbUserPassword+"&query="+dbSqlReguest+dbSqlFormatAnswer;
									reqRes.push(curRes);

									(async function(curRes) {
										let response = await getData(dbFullSqlReguest,reqRes[j]);									
										let data=reqRes[j];
										fillRequestDBObjectsInTree(response,rootDbNode,data,0);
										j++;
									})();								
									
									dbSqlReguest="SELECT distinct name value FROM system.tables where engine = 'View' and database='default'";
									dbSqlReguest.replace(/ /g,"%20");
									dbFullSqlReguest="https://"+dbUrlReguest+"/?user="+dbUserName+"&password="+dbUserPassword+"&query="+dbSqlReguest+dbSqlFormatAnswer;
									reqRes.push(curRes);
									(async function(curRes) {
										let response = await getData(dbFullSqlReguest,reqRes[j]);									
										let data=reqRes[j];
										fillRequestDBObjectsInTree(response,rootDbNode,data,1);
										j++;
									})();								
									curRes=new Object;
																	
									break;								
							}							
						});					
					})();
				}	
			}else{
				if( msgBox==undefined)
					createWarningMessageBox();
				messageBox(true,"Empty request list!");
			}
			if(stateQueryListStr!=undefined){
				if(stateQueryListStr.length>0){
					stateObject=JSON.parse(stateQueryListStr);
					if(stateObject['queryList']!=undefined){
						if(Array.isArray(stateObject['queryList'])==true){
							queryList=stateObject['queryList'];
							readQueryState(queryList);
						}
					}
				}
			}									
		}
		else{
			if( msgBox==undefined)
				createWarningMessageBox();
			messageBox(true,"Empty request list!");
		}		
	};

	//Ассинхронный запрос к удалённой БД для получения структуры удалённой БД (включая структуру таблиц и полей)
	function queryTableStructFromDB(tableName,parentNode){				
		switch (localStorage.getItem('dbType')) {
			case 0:			
			default:
				dbSqlReguest="DESCRIBE%20TABLE%20"+tableName;//Это запрос для СУБД ClickHouse (не происходит сортировка полей по алфавиту)
				dbFullSqlReguest="https://"+dbUrlReguest+"/?user="+dbUserName+"&password="+dbUserPassword+"&query="+dbSqlReguest+dbSqlFormatAnswer;		
				fetch(dbFullSqlReguest)//Собственно сам ассинхронный запрос к серверу
					.then((response) => {
						if (response.status >= 200 && response.status < 300) {
							return response;
						}
						else{
							let error = new Error(response.statusText);
							throw error;
						}
					})
					.then(response => response.text())//В случае ответа получить в текстовом виде результат
					.then(function(textBlock){return fillTableFildsFromDB(textBlock,parentNode)})//Ассинхронная обработка полученного результата
					.catch(function(e){//Простейшая обработка ошибки запроса
						messageBox(true,window.Asc.plugin.tr("Error сonnection!")+" "+e);
						destroyLoader();
					}
				);			
		}			
	};

	//Ассинхронный запрос к удалённой БД для заполнения по результатам текущего SQL запроса
	function queryTableBySqlRequest(queryString){
		createLoader();
		queryString=verifiedSqlRequest(queryString);
		dbSqlReguest=encodeURIComponent(queryString);		
		
		switch (localStorage.getItem('dbType')) {
			case 0:
			default:
				dbSqlFormatAnswer="%20FORMAT%20JSON";				
				dbFullSqlReguest="https://"+dbUrlReguest+"/?user="+dbUserName+"&password="+dbUserPassword+"&query="+dbSqlReguest+dbSqlFormatAnswer;
				dbSqlFormatAnswer="%20FORMAT%20JSON";
				dbFullSqlReguest="https://"+dbUrlReguest+"/?user="+dbUserName+"&password="+dbUserPassword+"&query="+dbSqlReguest+dbSqlFormatAnswer;				
				fetch(dbFullSqlReguest)				
				//Собственно сам ассинхронный запрос к серверу
				.then((response) => {
					if (response.status >= 200 && response.status < 300) {
						return response;
					}
					else{
						let error = new Error(response.statusText);
						throw error;
					}
				})
				.then(response => response.text())//В случае ответа получить в текстовом виде результат
				.then(function(textBlock){return createLocalTableBySqlQuery(textBlock)})//Ассинхронная обработка полученного результата
				.catch(function(e){//Простейшая обработка ошибки запроса					
					messageBox(true,window.Asc.plugin.tr("Error сonnection!")+" "+e);
					destroyLoader();
				});				
				break;			
		}
	};
	//Создать узловой корень и заполнить структуру по текущему соединению  к БД (typeData - тип: таблицы(0) или представления(1))
	function fillRequestDBObjectsInTree(textBuf,rootDbNode,data,typeData){			
		var itm;	
		var localRootNode=undefined;
		let rows=textBuf.split('\n');
		let rowCount=rows.length;
		
		if(rowCount>0)
		{
			if(data['root']==undefined){
				rootNode = rootDbNode.addChildren({
					folder:true,
					type:TypeTreeNode.SQL,
					icon:'resources/wifi.png',
					title:data['name'],
				});
				data['root']=rootNode;
				currentConnectionName=data['name'];														
			}
			if(typeData==0){				
				localRootNode =  data['root'].addChildren({
					folder:true,
					type:TypeTreeNode.DB,
					title:'Tables'
				});
			}
			else if(typeData==1){							
				localRootNode = data['root'].addChildren({
					folder:true,
					type:TypeTreeNode.DB,
					title:'Views'
				});
			}

			rows.forEach(element => {
				if(element.length>0){					
					itm=element.replace(/\"/g,'');										
					if(itm.length>0){
						childNode = localRootNode.addChildren({
							title: itm,
							iconTooltip:window.Asc.plugin.tr("Transfer title by double click"),
							tooltip:window.Asc.plugin.tr("Transfer title by double click"),
							type:TypeTreeNode.TABLE,
							folder: false,
							icon:'resources/db.ico',
						});
						queryTableStructFromDB(itm,childNode);
					}					
				}			
			});								
		}
		destroyLoader();
		return 	rootNode;
	};
	//Заполнить в дереве объектов структуру полей таблицы 
	function fillTableFildsFromDB(textBuf,parentNode)
	{		
		var cols;		
		var rowCount,colCount;
		$(formElement.txtAreaRes).val(textBuf);
		let rows=textBuf.split('\n');
		rowCount=rows.length;					
		if(rowCount>0){																	
			dbSelectedFields=[];
			for(i=0;il=rowCount,i<il;i++){							
				cols=rows[i].replace(/\"/g,'').split(',');	
				colCount=cols.length;				
				if(colCount>0)
				{
					if(cols[0].length>0)
					{
						parentNode.addChildren({							
							title: cols[0]+"#("+cols[1]+ ")",
							type:TypeTreeNode.FIELD,
							iconTooltip:window.Asc.plugin.tr("Transfer title by double click"),
							tooltip:window.Asc.plugin.tr("Transfer title by double click"),
							folder: false,
							icon:"resources/form-date-field.ico",							
						});														
					}					
				}				
			}						
		}		
	};

	//Заполнить по результатам SQL запроса локальную таблицу
	function createLocalTableBySqlQuery(textBlock){		
		var req;
		var data2;	
		var column2=[];
		var columnItem;
		var j,jl;
		var divTableElement;		
		var tableWidthValue=$("#queries_list").width()*0.95;
		switch (localStorage.getItem('dbType')) {
			case 0:			
			default:
				req=JSON.parse(textBlock);
				let rowCount=req["data"].length;
				if(rowCount>0){					
					let meta=req["meta"];
					let colCount=meta.length;
					data2=req["data"];
					for(j=0;jl=colCount,j<jl;j++){																
						columnItem=new Object;
						columnItem['title']=meta[j].name;
						columnItem['type']= meta[j].type;//'text';						
						columnItem['width']=(tableWidthValue-70)/(colCount);
						columnItem['align']='right';
						column2.push(columnItem);														
					}					

					if(currentSpreadShitId.length>0)
					{
						divTableElement = document.getElementById(currentSpreadShitId);
					}

					if(divTableElement!=undefined){
						jspreadsheet.destroy(document.getElementById(currentSpreadShitId));						
					}

					requestTable = jspreadsheet(document.getElementById(currentSpreadShitId), {						
						tableOverflow:true,
						tableHeight:heightTableInQuery +'px',
						tableWidth:tableWidthValue +'px',						
						data:data2,
						columns: column2,						
						contextMenu: function() {
							return false;
						}												
					});
				}
				break;			
		}
		destroyLoader();
	};
	//Получить и заполнить структуру сохранённых в текущем документе редактора именнованных диапзаонов созданных с помощью макроса
	function getSheetStructureFromBook(parentNode){
		var sheetNode,rangeNode;			
		//resulRangeFind получается ранее ассинхронным запросом 'onReadSheets' к базовому скрипту code.js
		if (resulRangeFind==undefined || resulRangeFind.length==0){			
			return;
		}
		
		var res= JSON.parse(resulRangeFind);
		
		var sheet_pages,prop;
		if(sheetsParentNode==undefined){			
			if(res!=undefined){
				let  name=res['name_document'];
				if(name!=undefined)
					nameCurrentBook=name;
			}
			sheetsParentNode=parentNode.addChildren({
				folder:true,
				icon:'resources/base_editor.ico',
				type:TypeTreeNode.BOOK,
				title:window.Asc.plugin.tr("Document")+":"+nameCurrentBook,
			});			
		}else{
			clearTableTree(sheetsParentNode);			
		}		
		
		if(res!=undefined)
		{
			let sheets=res.sheets;
			if(sheets!=undefined){				
				sheets.forEach(sheet => {					
					sheetNode=sheetsParentNode.addChildren({
			 		 	folder:true,
						icon:'resources/spreadsheet_table.ico',
						type:TypeTreeNode.SHEET,
			 		 	title:sheet['name_sheet']
			 		 });
					 sheet_pages=sheet['table_sheet'];
					 if(sheet_pages.length>0)
					 {
						sheet_pages.forEach(range => {							
							prop=range['properties'];
							if(prop!=undefined){
								let dateQuery=formatDate(new Date(prop['date_time']));
								rangeNode=sheetNode.addChildren({
									folder:false,
									icon:'resources/field_sql.ico',									
									iconTooltip:prop['name']+'\nSQL:'+prop['query']+'\n'+ window.Asc.plugin.tr("Date SQL query")+dateQuery,
									key:prop['query'],					
									type:TypeTreeNode.NAMED_RANGE,
									title:range['name_range']
								});							
							}
						});
					 }
			 	});
			}
		}		
	};

	//Ассинхронное заполнение даныых о структуре DB 
	getData = async (url,obj) => {
		var txtresp="";
		const response = await fetch(url);
		if(response.status>=200&&response.status<=300){
			txtresp=await response.text();
				if(obj!=undefined)
					obj['res'] = txtresp;	
		}
		else{
			if( msgBox==undefined)
				createWarningMessageBox();
			messageBox(true,window.Asc.plugin.tr("Error сonnection!")+" "+response.statusText);
		}
		return txtresp;			
	};
	
	//Сменить параметры запроса под текущий SQL запрос
	function changeCurrentConnectionParams()
	{	
		findCurrentQuery();
		var bFind=false;	
		if(queryItem!=undefined && connectionList.length>0)
		{
			let currentConnectionName=queryItem['connection_name'];
			connectionList.forEach(connect => {
				if(connect['name']==currentConnectionName){
					bFind=true;
					dbRequestName=connect['name'];
					dbUrlReguest=connect['url'];
					dbUserName=connect['username'];
					dbUserPassword=connect['password'];
				}				
			});

			if(!bFind){
				if( msgBox==undefined)
					createWarningMessageBox();
				messageBox(true,window.Asc.plugin.tr("Connection")+ " "+currentConnectionName + " "+window.Asc.plugin.tr("not found!"));
			}
		}
	}

	//Поиск и установка текущего SQL запроса, по выбранному элементу в аккардеоне сохранённых запросов (через currentElementID)
	function findCurrentQuery()
	{
		if(currentElementID>=0 && queryList.length>0)
		{
			queryList.forEach(query => {
				if(query['idx_element']==currentElementID){
					queryItem=query;									
				}				
			});
			currentSpreadShitId='spreadsheet'+currentElementID;
			requestTable=document.getElementById(currentSpreadShitId).jspreadsheet;

		}
		else{
			queryItem=undefined;
		}		
	}

	//Чтение и заполнение аккордиона с запросами из объекта текущего состояния  макроса
	function readQueryState(queryArray){
		if(queryArray.length>0){
			iQuery=0;
			queryArray.forEach(element=>{
				queryItem=element;
				addAccordeonQueryItem();
			});	
		}
	}	
	
	//Добавить новый SQL запрос для выбранного соединения
	function addSqlQuery(){		
		queryItem=new Object;								
		queryItem['connection_name']=currentConnectionName;						
		queryItem['name_element']='query'+ iQuery;
		queryItem['idx_element']=iQuery;		
		queryItem['sql']='select * from  limit 1000/* при работе с большими массивами данных использование  LIMIT обязательно */';
		queryList.push(queryItem);
		$( "#dialog-menu" ).dialog( "close" );
		addAccordeonQueryItem();
		window.Asc.plugin.onTranslate();
	};

	function addAccordeonQueryItem(){
		var str;		
		if(accordionOfQueries==undefined){
			createAccordionOfQueries();		
		}
			
		str="<h3 id='header_query"+ iQuery +"' style='width:99%;padding:1px;margin:0px'>" + queryItem['connection_name'] +":"+queryItem['name'] + "</h3>";
		str+="<div id='query"+ iQuery +"' style='width:99%;padding:1px;margin:0px'>";
		str+="<table style='width:100%;height: "+ (heightDivAccordion) +"px;'>";
		str+="<tr><td colspan='3'>";
		str+="<textarea style='width:99%;height:100px;border-radius:4px' id='txtSQL"+iQuery+"' class='form-control ldt'>"+ queryItem['sql'] +"</textarea>";			
		str+="</td></tr>";
		str+="<tr>";
		str+="<!--td><button id='btnClear" +iQuery+"' >ClearSQL</button></td--><td><button class='run_SQL' id='btnRunSQL"+iQuery+"'>Preview</button></td>";//<td><input type='checkbox'  id='chbPagination"+iQuery+"' checkPagination >Разбить</input></td>";
		str+="</td></tr>";
		str+="<tr><td  colspan='3'>";
		str+="<span class='result_query'>Preview:</span>";
		str+="<div id='spreadsheet" +iQuery+"' style='width:100%;height:"+ (heightDivAccordion-90) +"px; overflow:scroll'></div>";			
		str+="</td></tr>";
		str+="<tr>";		
		str+="<td><button class='delete_query' id='delete_query"+ iQuery +"'>Delete query</button></td>";
		str+="<td><button style='float:right;' class='send_table' id='btnSendTable"+iQuery+"'>Upload to document</button></td>";
		str+="<td><button style='float:right;' class='send_close_table' id='btnSendTableAndClose"+iQuery+"'>Upload to document and close</button></td>";				
		str+="</tr>";
		str+="</table>";
		str+="</div>";
		$('#queries_list').append(str);
		//обновить список аккардеона

		$( "#queries_list" ).accordion( "refresh" );
		//обработка нажатия кнопки "удалить текущее соединение"
		
		$("#delete_query"+ iQuery).click(function(){
			onRemoveQuery($(this).attr('id'));						
		});		

		// $("#txtSQL"+iQuery).highlightWithinTextarea({
		// 	highlight: /select|DISTINCT|ON|where|FINAL|SAMPLE|ARRAY|GLOBAL|ANY|ALL|from|limit|like|not|and|or|join|left|right|INNER|FULL|CROSS|GROUP|BY|WITH|TO|STEP|LIMIT|UNION /gi,
		// 	className: 'blue'
		// });
		
		$("#txtSQL"+iQuery).on("change input selectionchange", function() {				
			var currentVal = $(this).val();
			if(currentVal.length>0) {
				queryItem['sql']=currentVal;
			}
		});
	
		$("#btnRunSQL"+ iQuery).click(function(){
			onRunQuery($(this).attr('id'));						
		});
		
		$("#btnSendTable"+ iQuery).click(function(){
			onSendAsTable($(this).attr('id'));						
		});

		$("#btnSendTableAndClose"+ iQuery).click(function(){
			onSendAsTableAndClose($(this).attr('id'));						
		});
	
		iQuery++;		
	}

	function createAccordionOfQueries(){
		accordionOfQueries=$( '#queries_list' ).accordion({				
			collapsible: true,
			activate: function( event, ui ) {
				if(event.type=='accordionactivate'){
					 currentElementName=$(ui.newPanel).attr("id");
					if(currentElementName==undefined)
					{
						currentElementName=$(ui.oldPanel).attr("id");
					}
					if(currentElementName!=undefined && currentElementName.length>0)
					{
						let tmp='query';
						tmp=currentElementName.substring(tmp.length,currentElementName.length);							
						if(tmp.length>0)
						{
							currentElementID=Number(tmp);							
							changeCurrentConnectionParams();
						}
					}					
				}
			},
	   });
	}

	//отработка нажатия на кнопку удалить соединение внутри описателя соединений в аккардеоне	
	function onRemoveQuery(idQueryElements){
		var tmp,num;
		tmp='delete_query';//название id кнопки без номера				
		if(idQueryElements.length>0){
			//вычлиняем номер
			tmp=idQueryElements.substring(tmp.length,idQueryElements.length);
			if(tmp.length>0)
			{
				num=Number(tmp);
				//удалить в аккардеоне элементы с таким же номером
				$("#header_query"+num).remove();
				$("#query"+num).remove();
				//обновить аккардеон
				if($('.ui-accordion-header').length>0)
					$( "#query_list" ).accordion( "refresh" );				
				if(queryList.length>0){
					let j=0;
					queryList.forEach(query => {
						if(query['idx_element']==num){
							delete queryList[j];
							queryList.splice(j,1);
							j--;							
						}
						j++;
					});
				}
			}
		}
	};

	function onRunQuery(idQueryElements){
		var tmp,num;
		tmp='btnRunSQL';//название id кнопки без номера				
		if(idQueryElements.length>0){
			//вычлиняем номер
			tmp=idQueryElements.substring(tmp.length,idQueryElements.length);
			if(tmp.length>0)
			{
				num=Number(tmp);
				currentSpreadShitId='spreadsheet'+num;
				tmp=$('#txtSQL'+num).val();
				if(tmp!=undefined && tmp.length>0)
					queryTableBySqlRequest(tmp);
			}
		}
	};
	
	function resizeTableWidth(newWidth){
		if(requestTable!=undefined){								
			let config=requestTable.getConfig();
			let header=config['columns'];
			let tableWidth=Number(requestTable.options.tableWidth.substring(0,requestTable.options.tableWidth.length-2));
			let coeff=newWidth/tableWidth;
			requestTable.options.tableWidth=(newWidth)+'px';
			requestTable.content.style.width=requestTable.options.tableWidth;
			let j=0;			
			header.forEach(item => {
				if(j>0)
					requestTable.setWidth(j,item['width']*coeff);
				j++;
			});			
		}
	};

	function onSendAsTableAndClose(idQueryElements){
		onSendAsTable(idQueryElements);
		dbSelectedTable='';				
		sendPluginMessage({type: 'onCancelMethod',data:dbSelectedTable});		
	};

	function onSendAsTable(idQueryElements){
		var tmp,num;
		var js=new Object();
		var table,j;
		var cellItem;
		tmp='btnSendTable';//название id кнопки без номера				
		if(idQueryElements.length>0){
			//вычленяем номер
			tmp=idQueryElements.substring(tmp.length,idQueryElements.length);
			if(tmp.length>0)
			{
				num=Number(tmp);
				dbSqlReguest=$('#txtSQL'+num).val();
				js['sql']=dbSqlReguest;
				if(requestTable!=undefined){					
					let config=requestTable.getConfig();
					let header=config['columns'];
					let meta=new Array();						
					
					header.forEach(item => {
						meta.push({name:item.name,type:item.type})
					});

					if(selectedRows.length==0){
						table=requestTable.getJson();
					}
					else{						
						table=[];						
						cellItem=new Object();
						selectedRows.forEach(item => {							
							j=0;							
							cellItem=new Object();
							item.forEach(cell => {																	
								cellItem[header[j].title]=cell;															
								j++;
							});
							table.push(cellItem);						
						});
					}
					
					let qr={};
					if(queryItem!=undefined){
						qr['connection_name']=queryItem['connection_name'];
						qr['name']=queryItem['name'];
						qr['full_name']=queryItem['connection_name']+':'+queryItem['name'];
						qr['query_datetime']=Date.now();
						qr['query_name']='query'+qr['query_datetime'];
						qr['query']	=queryItem['sql'];
					}
					else{
						qr['connection_name']='connection_name';
						qr['name']='name';
						qr['full_name']='connection_name'+':'+'name';
						qr['query_datetime']=Date.now();
						qr['query_name']='query'+qr['query_datetime'];
						qr['query']	='sql';	
					}							

					if(table.length>0 ){						
						js['meta']=meta;
						js['data']=table;
						js['query']=qr;
					}
					sendPluginMessage({type: "onFillTableFromJson",data:JSON.stringify(js)});
					sendPluginMessage({type: "onReadSheets"});	
				}
			}
		}
	};

	//Основная функция плагина
    window.Asc.plugin.init = function()
    {	
		heightDivAccordion=460;
		heightTableInQuery=heightDivAccordion-107;
		formElement={			
			treeDb: document.getElementById("tree-db"),						
			btnAddSqlReq:document.getElementById("btn-add-request"),
			btnAddQuery:document.getElementById("btnAddQuery"),
			btnSaveState:document.getElementById("btnSaveState"),			
			btnCancel:document.getElementById("btnCancel"),
			btnHideTree:document.getElementById("btnHideTree"),				
		};
		
		sendPluginMessage({type: "onReadSheets"});		

		$(function() {  			
			//Отработка нажатия на кнопку "Сохранить состояние" 
			$(formElement.btnSaveState).click(function(){																
				stateObject={};
				stateObject['queryList']=queryList;
				localStorage.setItem('xldbFreeStateQuery',JSON.stringify(stateObject));					
			});
			
			//Отработка нажатия на кнопку "Cancel" 
			$(formElement.btnCancel).click(function(){
				dbSelectedTable='';				
				sendPluginMessage({type: 'onCancelMethod',data:dbSelectedTable});				
			});
				
			//Отработка нажатия на кнопку "Hide tree" 
			$(formElement.btnHideTree).click(function(){
				var $blockLeft = $("#left-column");
				var $blockRight = $("#right-column");
				var width;
				if ($blockLeft.is(':visible')) {					
					$blockLeft.css({"display":"none"});
					$blockRight.css({"float":"left","width":"100%"});					
					$(formElement.btnHideTree).text(window.Asc.plugin.tr("show2"));
				}
				else{							
					$blockLeft.css({"display":"block"});
					$blockRight.css({"float":"right","width":"70%"});					
					$(formElement.btnHideTree).text(window.Asc.plugin.tr("hide1"));			
				}

				width=$("#right-column").width();				
				resizeTableWidth(width-40);											
			});
			
			//Отработка нажатия на кнопку "Add new query" 
			$(formElement.btnAddQuery).click(function(){
				//if(currentConnectionID.length>0)
					showNewQueryDialog(currentConnectionID);
			});
			
		    //Диалоговое сообщение что не все поля заполнены
			$( "#dialog-menu" ).dialog({
				modal: true,				
				width: 200,
				title: 'Добавить SQL запрос',//window.Asc.plugin.tr('Add sql'),
				autoOpen: false,
				beforeClose: function( event, ui ) {//Перед закрытием надо убедиться что поле "название запроса" было заполнено!				
					if($('#dialog-menu-name-sqlreq').val().length==0){
						if( msgBox==undefined)
							createWarningMessageBox();
						messageBox(true, "Empty name query");
					}
					else{
						if(queryItem!=undefined)
						{
							queryItem['name']=$('#dialog-menu-name-sqlreq').val();							
						}
					}
				}				
		  	});


			//Создать аккордион с описанием запросов, если он ещё не создавался
			if(accordionOfQueries==undefined){
				createAccordionOfQueries();		
			}

			createWarningMessageBox();

			$(formElement.btnAddSqlReq).click(function(){								
				addSqlQuery();
			});
			
		});		
		createObjectTree();			
		currentElementID=0;							
		changeCurrentConnectionParams();
    };

	//Обработчик передающий запрос к базовому окну где работает обработчик запросов
	function sendPluginMessage(message) {
		window.Asc.plugin.sendToPlugin("onWindowMessage", message);
	};

	window.Asc.plugin.onTranslate = function(){
		//Внутри index_tree_object.HTML 
		document.getElementById("btnHideTree").innerHTML = window.Asc.plugin.tr("hide1");
		document.getElementById("btnAddQuery").innerHTML = window.Asc.plugin.tr("Add new");
		document.getElementById("btn-add-request").innerHTML = window.Asc.plugin.tr("Add sql");
		document.getElementById("btnSaveState").innerHTML = window.Asc.plugin.tr("Save state");		
		//Внутри  скрипта index_tree_object.js
		document.querySelectorAll(".result_query").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Preview")});		
		document.querySelectorAll(".send_table").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Upload")});
		document.querySelectorAll(".send_close_table").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Upload and close")});		
		document.querySelectorAll(".run_SQL").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Preview")});				
		document.querySelectorAll(".delete_query").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Delete query")});
	}

	//Событие ассинхронного запроса на проверку и заполнение структуры именнованных диапазонов в документе 
	window.Asc.plugin.attachEvent('onSearchRangeInWorkbook', function(resultScan) {
		if (!resultScan) return;
			resulRangeFind=resultScan;				
		
		getSheetStructureFromBook(rootDbNode);

		// Expand all tree nodes
		treeDbObject = $.ui.fancytree.getTree("#tree-frame");		
		treeDbObject.visit(function(node){
		node.setExpanded(true);	});
	});

	//Записать в текущей позиции редактора SQL запросов
	function sendFromTreeNodeToSqlEditor(insertText,txtarea){				
		var start = txtarea.selectionStart;
		//ищем последнее положение выделенного символа
		var end = txtarea.selectionEnd;
		// текст до + вставка + текст после (если этот код не работает, значит у вас несколько id)
		var finText = txtarea.value.substring(0, start) + insertText + txtarea.value.substring(end);
		// подмена значения
		txtarea.value = finText;
		if(queryItem!=undefined)
			queryItem['sql']=finText;
		// возвращаем фокус на элемент
		txtarea.focus();
		
		// возвращаем курсор на место - учитываем выделили ли текст или просто курсор поставили
		txtarea.selectionEnd = ( start == end )? (end + insertText.length) : end ;
	};

	function createLoader() {
        loader && (loader.remove ? loader.remove() : $('#loader-container3')[0].removeChild(loader));
		loader = showLoader($('#loader-container3')[0], 'Request to db...');
    };

	function destroyLoader() {
		loader && (loader.remove ? loader.remove() : $('#loader-container3')[0].removeChild(loader));
		loader = undefined;
	};
	
	//Показать окно сообщений
	function messageBox(bShow,txtMessage){		
		if(bShow==true)
		{	
			txtMessage=window.Asc.plugin.tr(txtMessage);
			$( "#dialog-message-text" ).text( txtMessage );
			$( "#dialog-message" ).dialog( "open" );
			window.Asc.plugin.onTranslate();			
		}else{
			$("#dialog-message" ).dialog( "close" );
		}
	};
	
	//Показать окно контекстоного меню добавления нового SQL запроса 
	function showNewQueryDialog(idElementToPosition){		
			//если есть новое соединение 			
			//Проверка, что все поля заполненый иначе модальное окно, что надо ввести все поля
			if(currentConnectionName.length==0)
			{
				if( msgBox==undefined)
					createWarningMessageBox();
				messageBox(true,'No connection selected!');
			}			
			else{//Все поля заполнены, добавить в список				
				if(idElementToPosition.length>0)
					$( "#dialog-menu" ).dialog( "option", "position", { my: "left top", at: "right top", of:idElementToPosition } );
				else
					$( "#dialog-menu" ).dialog();

				$( "#dialog-menu" ).dialog( "open" );//Модальное окно				
			}
		//}
	};	

	function createWarningMessageBox(){
		if(msgBox==undefined){
			msgBox=$( "#dialog-message" ).dialog({
				modal: true,				
				width: 200,
				title: "Внимание!",//window.Asc.plugin.tr("Warning!"),
				autoOpen: false,
				buttons: {
					Ok: function() {
						$( this ).dialog( "close" );
					}
				}
			});
		}
	};

	function clearTableTree(rootNode){
		if(rootNode.hasChildren())
		{
			let child=rootNode.children;				
			for(i=child.length-1;i>=0;i--)
			{
				node=child[i];
				while( node.hasChildren() ) {
					node.getFirstChild().remove();
				}
				node.remove();
			}
		}	
	};

	function verifiedSqlRequest(query){
		var verified_query, tmp_query;
		let spl_query=query.split(";");
		
		if(spl_query.length>1){
			verified_query=spl_query[0];
		}
		else{
			verified_query=query;
		}
				
		return verified_query;
	};

	function formatDate(date) {
		let dayOfMonth = date.getDate();
		let month = date.getMonth() + 1;
		let year = date.getFullYear();
		let hour = date.getHours();
		let minutes = date.getMinutes();		
	  
		// форматирование
		year = year.toString().slice(-2);
		month = month < 10 ? '0' + month : month;
		dayOfMonth = dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth;
		hour = hour < 10 ? '0' + hour : hour;
		minutes = minutes < 10 ? '0' + minutes : minutes;
		return `${dayOfMonth}.${month}.${year} ${hour}:${minutes}`;		
	}


})(window, undefined);
