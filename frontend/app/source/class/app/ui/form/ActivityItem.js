/**
 * ActivityItem
 *
 * @author tobiasb
 * @since 2018
 * @ignore(showdown)
 */

qx.Class.define('app.ui.form.ActivityItem', {
  extend: qx.ui.core.Widget,
  implement: [qx.ui.form.IModel],
  include: [qx.ui.form.MModelProperty],

  /*
  ******************************************************
    CONSTRUCTOR
  ******************************************************
  */
  construct: function (label, icon, model) {
    this.base(arguments, label, icon, model)
    this._setLayout(new qx.ui.layout.VBox())
    this.__converter = new showdown.Converter()

    this.addListener('pointerover', this._onPointerOver, this)
    this.addListener('pointerout', this._onPointerOut, this)

    this.__dateFormat = new qx.util.format.DateFormat('H:m')

    this.setAuthorRoles(new qx.data.Array())

    this.getContentElement().addClass('activity')
  },

  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */
  events: {
    /** (Fired by {@link qx.ui.form.List}) */
    'action': 'qx.event.type.Event'
  },

  /*
  ******************************************************
    PROPERTIES
  ******************************************************
  */
  properties: {
    appearance: {
      refine: true,
      init: 'activity-listitem'
    },

    title: {
      check: 'String',
      nullable: true,
      apply: '_applyLabelValue'
    },

    message: {
      check: 'String',
      nullable: true,
      apply: '_applyLabelValue'
    },

    rich: {
      check: 'Boolean',
      init: true,
      event: 'changedRich'
    },

    published: {
      check: 'Date',
      init: null,
      apply: '_applyPublished'
    },

    author: {
      check: 'app.model.Actor',
      init: null,
      apply: '_applyAuthor'
    },

    authorRoles: {
      check: 'qx.data.Array',
      init: null
    }
  },

  /*
  ******************************************************
    MEMBERS
  ******************************************************
  */
  members: {
    __converter: null,
    __dateFormat: null,
    _roleController: null,

    // property apply
    _applyLabelValue: function (value, old, name) {
      const control = this.getChildControl(name)
      if (value) {
        control.setValue(this.__converter.makeHtml(value))
        control.show()
      } else {
        control.exclude()
      }
    },

    // property apply
    _applyPublished: function (value) {
      this.getChildControl('published').setValue(this.__dateFormat.format(value))
    },

    // property apply
    _applyAuthor: function (author, old) {
      this.__bindAuthorProperty('authorName', author, 'name', old)
      this.__bindAuthorProperty('authorUsername', author, 'username', old, {
        converter: function (value) {
          return '@' + value
        }
      })
      const roles = this.getAuthorRoles()
      roles.removeAll()
      if (app.Model.getInstance().getSelectedSubscription().getChannel().getOwnerId() === author.getId()) {
        roles.push(this.tr('Owner'))
      }
      if (author.getType() === 'Bot') {
        roles.push(this.tr('Bot').toUpperCase())
      } else if (author.getType() === 'Server') {
        roles.push(this.tr('Server'))
      } else {
        roles.unshift(author.getRole())
      }
      if (roles.getLength() > 0) {
        this.getChildControl('authorRoles').show()
      } else {
        this.getChildControl('authorRoles').exclude()
      }
    },

    __bindAuthorProperty: function (childControlName, author, propertyName, oldAuthor, bindProperties) {
      let control = this.getChildControl(childControlName)
      if (oldAuthor) {
        oldAuthor.removeRelatedBindings(control)
      }
      author.bind(propertyName, control, 'value', bindProperties)
    },

    // overridden
    _createChildControlImpl: function (id, hash) {
      let control

      switch (id) {
        case 'header':
          const layout = new qx.ui.layout.HBox()
          layout.setAlignY('middle')
          control = new qx.ui.container.Composite(layout)
          this._addAt(control, 0)
          break

        case 'authorName':
          control = new qx.ui.basic.Label()
          control.setAnonymous(true)
          this.getChildControl('header').addAt(control, 0)
          break

        case 'authorRoles':
          control = new qx.ui.form.List(true)
          control.set({
            height: null,
            width: null,
            minHeight: null,
            minWidth: null,
            anonymous: true
          })
          this._roleController = new qx.data.controller.List(this.getAuthorRoles(), control, '')
          this._roleController.setDelegate({
            configureItem: function (item) {
              item.setAppearance('authorRole-listitem')
            }
          })
          this.getChildControl('header').addAt(control, 2)
          break

        case 'authorUsername':
          control = new qx.ui.basic.Label()
          control.setAnonymous(true)
          this.getChildControl('header').addAt(control, 1)
          break

        case 'published':
          control = new qx.ui.basic.Label(this.__dateFormat.format(this.getPublished()))
          control.setAnonymous(true)
          this.getChildControl('header').addAt(control, 3)
          break

        case 'title':
          control = new qx.ui.basic.Label(this.getTitle())
          control.setAnonymous(true)
          this.bind('rich', control, 'rich')
          this._addAt(control, 1)
          break

        case 'message':
          control = new qx.ui.basic.Label(this.getMessage())
          control.setAnonymous(true)
          this.bind('rich', control, 'rich')
          this._addAt(control, 2, {flex: 1})
          break
      }
      return control || this.base(arguments, id, hash)
    },

    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates: {
      focused: true,
      hovered: true,
      selected: true,
      dragover: true
    },

    /**
     * Event handler for the pointer over event.
     */
    _onPointerOver: function () {
      this.addState('hovered')
    },

    /**
     * Event handler for the pointer out event.
     */
    _onPointerOut: function () {
      this.removeState('hovered')
    }
  },

  destruct: function () {
    this.removeListener('pointerover', this._onPointerOver, this)
    this.removeListener('pointerout', this._onPointerOut, this)
  }
})
