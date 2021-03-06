/**
 * ESUI (Enterprise Simple UI)
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @ignore
 * @file 下拉框控件
 * @author otakustay
 */
define(
    function (require) {
        var u = require('underscore');
        var lib = require('./lib');
        var InputControl = require('./InputControl');
        var Layer = require('./Layer');
        var eoo = require('eoo');
        var painters = require('./painters');
        var $ = require('jquery');
        var esui = require('./main');

        /**
         * `Select`控件使用的层类
         *
         * @extends Layer
         * @ignore
         * @constructor
         */
        var SelectLayer = eoo.create(Layer, {
            constructor: function () {
                this.$super(arguments);
            },

            create: function () {
                var ele = this.$super(arguments);
                $(this.control.main).after(ele);
                return ele;
            },

            nodeName: 'ol',

            render: function (element) {
                var html = '';

                for (var i = 0; i < this.control.datasource.length; i++) {
                    var item = this.control.datasource[i];
                    var classes = this.control.helper.getPartClasses('item');
                    if (item.disabled) {
                        classes.push.apply(
                            classes,
                            this.control.helper.getPartClasses('item-disabled')
                        );
                    }
                    html += '<li data-index="' + i + '" '
                        + 'class="' + classes.join(' ') + '">';
                    html += this.control.getItemHTML(item);
                    html += '</li>';
                }

                element.innerHTML = html;
            },

            initBehavior: function (element) {
                var helper = this.control.helper;

                helper.addDOMEvent(element, 'click', '.' + helper.getPrimaryClassName('item'), selectValue);
                $(element).addClass(helper.getPrefixClass('dropdown'));
            },

            syncState: function (element) {
                var classes = this.control.helper.getPrimaryClassName('item-selected');
                var $items = $(element).children();
                var selected = this.control.selectedIndex;

                $items.each(function (index, ele) {
                    var $item = $(ele);
                    if (index === selected) {
                        $item.addClass(classes);
                    }
                    else {
                        $item.removeClass(classes);
                    }
                });
            },

            dock: {
                strictWidth: true
            },

            /**
             * @override
             */
            show: function () {
                this.$super(arguments);
                focusItem.call(this, this.control.get('selectedIndex'));
            }
        });

        /**
         * 将指定选项滚动到可视范围内
         *
         * @param {number} index 选项的index
         */
        function focusItem(index) {
            var layer = this.getElement();
            // jquery nth strat with 1
            var selectedItem = $('li:nth-child(' + (index + 1) + ')', layer);
            if (selectedItem.length) {
                // item高度
                var itemHeight = selectedItem.outerHeight(true);
                // 计算出需要的scrollTop
                var expectedScrollTop = itemHeight * index - (layer.clientHeight - itemHeight) / 2;
                layer.scrollTop = expectedScrollTop;
            }
        }

        /**
         * 下拉选择控件
         *
         * 类似HTML的`<select>`元素
         *
         * @extends InputControl
         * @constructor
         */
        var Select = eoo.create(InputControl, {
            constructor: function () {
                this.$super(arguments);
                this.layer = new SelectLayer(this);
            },

            /**
             * 控件类型，始终为`"Select"`
             *
             * @type {string}
             * @readonly
             * @override
             */
            type: 'Select',

            /**
             * 初始化参数
             *
             * 如果初始化时未给定{@link Select#datasource}属性，
             * 且主元素是`<select>`元素，则按以下规则生成一个数据源：
             *
             * 1. 遍历主元素下所有`<option>`元素
             * 2. 以`<option>`元素的`name`属性作为数据项的`name`
             * 3. 如果`<option>`元素没有`name`属性，则使用`text`属性
             * 4. 以`<option>`元素的`value`属性作为数据项的`value`
             * 5. 如果`<option>`元素处于禁用状态，则此数据项同样禁用
             * 6. 如果`<option>`处于选中状态，
             * 且初始化未给定{@link Select#selectedIndex 值相关的属性}，
             * 则使用此项的下标作为{@link Select#selectedIndex}属性
             *
             * 如果主元素是`<select>`元素，控件会从主元素上抽取相关DOM属性作为控件自身的值，
             * 详细参考{@link Helper#extractOptionsFromInput}方法
             *
             * @param {Object} [options] 构造函数传入的参数
             * @protected
             * @override
             */
            initOptions: function (options) {
                var defaults = {
                    datasource: [],
                    tabIndex: 0
                };

                var properties = {};
                u.extend(properties, defaults, options);

                // 如果主元素是个`<select>`元素，则需要从元素中抽取数据源，
                // 这种情况下构造函数中传入的`datasource`无效
                if (this.main.nodeName.toLowerCase() === 'select') {
                    properties.datasource = [];
                    var elements = this.main.getElementsByTagName('option');
                    for (var i = 0, length = elements.length; i < length; i++) {
                        var item = elements[i];
                        var dataItem = {
                            name: item.name || item.text,
                            value: item.value
                        };
                        if (item.disabled) {
                            dataItem.disabled = true;
                        }

                        properties.datasource.push(dataItem);

                        // 已经选择的那个会作为值，
                        // 但如果构造函数中有传入和值相关的选项，则跳过这段逻辑
                        if (item.selected
                            && properties.selectedIndex == null
                            && properties.value == null
                            && properties.rawValue == null
                        ) {
                            // 无值的话肯定是在最前面
                            properties.selectedIndex = item.value ? i : 0;
                        }
                    }

                    this.helper.extractOptionsFromInput(this.main, properties);
                }

                this.setProperties(properties);
            },

            /**
             * 每个节点显示的内容的模板
             *
             * 在模板中可以使用以下占位符：
             *
             * - `{string} text`：文本内容，经过HTML转义
             *
             * @type {string}
             */
            itemTemplate: '<span>${text}</span>',

            /**
             * 获取每个节点显示的内容
             *
             * @param {meta.SelectItem} item 当前节点的数据项
             * @return {string} 返回HTML片段
             */
            getItemHTML: function (item) {
                if (u.isFunction(this.getCustomItemHTML)) {
                    return this.getCustomItemHTML(item);
                }

                var data = {
                    text: u.escape(item.name || item.text),
                    value: u.escape(item.value)
                };
                return lib.format(this.itemTemplate, data);
            },

            /**
             * 显示选中值的模板
             *
             * 在模板中可以使用以下占位符：
             *
             * - `{string} text`：文本内容，经过HTML转义
             *
             * @type {string}
             */
            displayTemplate: '${text}',

            /**
             * 获取选中值的内容
             *
             * @param {meta.SelectItem | null} item 选中节点的数据项，
             * 如果{@link Select#emptyText}属性值不为空且未选中任何节点，则传递`null`
             * @return {string} 显示的HTML片段
             */
            getDisplayHTML: function (item) {
                if (!item) {
                    return u.escape(this.emptyText || '');
                }
                if (u.isFunction(this.getCustomDisplayHTML)) {
                    return this.getCustomDisplayHTML(item);
                }

                var data = {
                    text: u.escape(item.name || item.text),
                    value: u.escape(item.value)
                };
                return lib.format(this.displayTemplate, data);
            },

            /**
             * 初始化DOM结构
             *
             * @protected
             * @override
             */
            initStructure: function () {
                var helper = this.helper;
                var arrow = 'arrow';
                var span = 'span';
                var mainElement = this.main;

                // 如果主元素是`<select>`，删之替换成`<div>`
                if (mainElement.nodeName.toLowerCase() === 'select') {
                    helper.replaceMain();
                    mainElement = this.main;
                }

                this.layer.autoCloseExcludeElements = [mainElement];
                mainElement.tabIndex = this.tabIndex;
                mainElement.innerHTML = helper.getPartHTML('text', span) + helper.getPartHTML(arrow, span);

                $(helper.getPart(arrow)).addClass(helper.getIconClass());
            },

            /**
             * 初始化事件交互
             *
             * @protected
             * @override
             */
            initEvents: function () {
                this.helper.addDOMEvent(this.main, 'click', toggle);
                this.layer.on('rendered', u.bind(addLayerClass, this));
            },

            /**
             * 获取原始值
             *
             * @return {Mixed}
             * @override
             */
            getRawValue: function () {
                if (this.selectedIndex < 0) {
                    return null;
                }

                var item = this.datasource[this.selectedIndex];
                return item ? item.value : null;
            },

            /**
             * 重渲染
             *
             * @method
             * @protected
             * @override
             */
            repaint: painters.createRepaint(
                InputControl.prototype.repaint,
                /**
                 * @property {number} width
                 *
                 * 宽度
                 */
                painters.style('width'),
                /**
                 * @property {number} height
                 *
                 * 高度，指浮层未展开时的可点击元素的高度， **与浮层高度无关**
                 * 不推荐使用这个属性来定义高度了。 直接通过CSS定义全局高度。
                 */
                painters.style('height'),
                {
                    /**
                     * @property {meta.SelectItem[]} datasource
                     *
                     * 数据源，其中每一项生成浮层中的一条
                     */
                    name: 'datasource',
                    paint: function (select) {
                        select.layer.repaint();
                    }
                },
                {
                    /**
                     * @property {number} selectedIndex
                     *
                     * 选中项的索引
                     *
                     * 本控件有3个属性能影响选中值，分别为{@link Select#selectedIndex}、
                     * {@link Select#value}和{@link Select#rawValue}
                     *
                     * 当这三个属性同时存在两个或多个时，它们之间按以下优先级处理：
                     *
                     *     selectedIndex < value < rawValue
                     *
                     * 即当{@link Select#rawValue}存在时，即便有{@link Select#value}或
                     * {@link Select#selectedIndex}属性，也会被忽略
                     *
                     * 当{@link Select#emptyText}不为空时，此属性可以为`-1`，
                     * 其它情况下属性值必须大于或等于`0`
                     */

                    /**
                     * @property {string} emptyText
                     *
                     * 未选中任何项时显示的值
                     *
                     * 当此属性不为空，且{@link Select#selectedIndex}属性的值为`-1`时，
                     * 控件处于未选中任何项的状态，此时将显示此属性的内容
                     */
                    name: ['selectedIndex', 'emptyText', 'datasource'],
                    paint: updateValue
                },
                {
                    name: ['disabled', 'hidden', 'readOnly'],
                    paint: function (select, disabled, hidden, readOnly) {
                        if (disabled || hidden || readOnly) {
                            select.layer.hide();
                        }
                    }
                }
            ),

            /**
             * 更新{@link Select#datasource}属性，无论传递的值是否变化都会进行更新
             *
             * @param {meta.SelectItem[]} datasource 新的数据源对象
             */
            updateDatasource: function (datasource) {
                if (!datasource) {
                    datasource = this.datasource;
                }
                this.datasource = datasource;
                var record = {name: 'datasource'};

                if (this.helper.isInStage('RENDERED')) {
                    this.repaint([record], {datasource: record});
                }
            },

            /**
             * 批量更新属性并重绘
             *
             * @param {Object} properties 需更新的属性
             * @override
             * @fires change
             */
            setProperties: function (properties) {
                // 为了`adjustValueProperties`正常工作，需要加上一点东西，
                // 由于在`setProperties`有相等判断，所以额外加相同的东西不影响逻辑
                if (properties.datasource == null) {
                    properties.datasource = this.datasource;
                }

                /**
                 * @property {string} value
                 *
                 * 字符串形式的值
                 *
                 * 该属性是将选中的{@link meta.SelectItem}中的`value`属性转为字符串后返回
                 *
                 * 对于属性的优先级，参考{@link Select#selectedIndex}属性的说明
                 *
                 * @override
                 */

                /**
                 * @property {Mixed} rawValue
                 *
                 * 控件的原始值
                 *
                 * 该属性是将选中的{@link meta.SelectItem}中的`value`属性直接返回
                 *
                 * 对于属性的优先级，参考{@link Select#selectedIndex}属性的说明
                 *
                 * @override
                 */
                if (properties.value == null
                    && properties.rawValue == null
                    && properties.selectedIndex == null
                    && properties.datasource === this.datasource
                ) {
                    properties.selectedIndex = this.selectedIndex;
                }
                if (!properties.hasOwnProperty('emptyText')) {
                    properties.emptyText = this.emptyText;
                }

                adjustValueProperties(properties);
                var changes = this.$super(arguments);

                if (changes.hasOwnProperty('selectedIndex')) {
                    /**
                     * @event change
                     *
                     * 值发生变化时触发
                     *
                     * `Select`控件的值变化是以{@link Select#selectedIndex}属性为基准
                     */
                    this.fire('change');
                }

                return changes;
            },

            /**
             * 销毁控件
             *
             * @override
             */
            dispose: function () {
                if (this.helper.isInStage('DISPOSED')) {
                    return;
                }

                if (this.layer) {
                    this.layer.dispose();
                    this.layer = null;
                }

                this.$super(arguments);
            },

            /**
             * 获取当前选中的{@link meta.SelectItem}对象
             *
             * @return {meta.SelectItem}
             */
            getSelectedItem: function () {
                return this.get('datasource')[this.get('selectedIndex')];
            }
        });

        /**
         * 切换下拉框
         *
         * @param {Event} e click事件对象
         */
        function toggle(e) {
            this.layer.toggle.call(this.layer, e);
        }

        /**
         * 根据下拉弹层的`click`事件设置值
         *
         * @param {Event} e 触发事件的事件对象
         * @ignore
         */
        function selectValue(e) {
            var target = e.currentTarget;

            if (!this.helper.isPart(target, 'item-disabled')) {
                var index = target.getAttribute('data-index');
                this.set('selectedIndex', +index);
                this.layer.hide();
                this.fire('changed');
            }
        }

        /**
         * 根据`selectedIndex` < `value` < `rawValue`的顺序调整三个参数的值
         *
         * @param {Object} context 有可能包含以上3个参数的参数对象
         * @ignore
         */
        function adjustValueProperties(context) {
            // 因为`value`可能多个项是相同的，所以必须一切以`selectedIndex`为准

            // 如果3个值都没有，就搞出默认值来
            if (context.selectedIndex == null
                && context.rawValue == null
                && context.value == null
            ) {
                context.selectedIndex = -1;
            }

            // 按`rawValue` > `value` > `selectedIndex`的顺序处理一下
            if (context.rawValue != null) {
                context.value = null;
                context.selectedIndex = null;
            }
            else if (context.value != null) {
                context.selectedIndex = null;
            }

            // 如果没给`selectedIndex`，那么就用`value`或`rawValue`来找第一个对上的
            if (context.selectedIndex == null
                && (context.value != null || context.rawValue != null)
            ) {
                // 以`rawValue`为优先
                context.selectedIndex = -1;
                var value = context.rawValue || context.value;
                for (var i = 0; i < context.datasource.length; i++) {
                    if (context.datasource[i].value === value) {
                        context.selectedIndex = i;
                        break;
                    }
                }
                delete context.value;
                delete context.rawValue;
            }

            // 有可能更换过`datasource`，或者给了一个不存在的`value`，
            // 则会导致`selectedIndex`无法同步，
            // 因此如果`selectedIndex`在数组范围外，要根据`emptyText`来决定修正
            if (context.selectedIndex < 0
                || context.selectedIndex >= context.datasource.length
            ) {
                if (context.emptyText) {
                    context.selectedIndex = -1;
                }
                else {
                    // 找最近的一个未禁用的项
                    context.selectedIndex = -1;
                    for (var j = 0; j < context.datasource.length; j++) {
                        if (!context.datasource[j].disabled) {
                            context.selectedIndex = j;
                            break;
                        }
                    }
                }
            }
        }

        function addLayerClass() {
            this.fire('layerrendered', {layer: this.layer});
        }

        /**
         * 根据控件的值更新其视图
         *
         * @param {Select} select 控件实例
         * @ignore
         */
        function updateValue(select) {
            // 同步显示的文字
            var textHolder = select.helper.getPart('text');
            var selectedItem = select.selectedIndex === -1 ? null : select.datasource[select.selectedIndex];
            var text = select.getDisplayHTML(selectedItem);

            textHolder.innerHTML = text;
            // to show hidden text as tool tip.
            textHolder.title = selectedItem ? (selectedItem.name || selectedItem.text) : select.emptyText;

            var layerElement = select.layer.getElement(false);
            if (layerElement) {
                select.layer.syncState(layerElement);
            }
        }

        esui.register(Select);
        return Select;
    }
);
