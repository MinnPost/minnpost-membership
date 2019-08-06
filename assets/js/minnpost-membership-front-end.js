"use strict";

// plugin
;

(function ($, window, document) {
  // Create the defaults once
  var pluginName = 'minnpostAmountSelect',
      defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountSelector: '.m-amount-select',
    amountLabels: '.m-amount-select label',
    amountValue: 'strong',
    amountDescription: '.a-amount-description'
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init() {
      var frequencies = $(this.element).find(this.options.frequencySelector);
      var amount = $(this.element).find(this.options.amountSelector);
      $(frequencies).change(this.onFrequencyChange.bind(this));
    },
    onFrequencyChange: function onFrequencyChange(event) {
      var amountElement = this.options.amountValue;
      var descElement = this.options.amountDescription;
      var labels = $(this.options.amountLabels);
      var frequencyString = $(event.target).val();
      var typeAndFrequency;
      var type;
      var frequency;

      if (labels.length < 0 || typeof frequencyString === 'undefined') {
        return;
      }

      typeAndFrequency = frequencyString.split(' - ');
      type = typeAndFrequency[0];
      frequency = parseInt(typeAndFrequency[1], 10);
      labels.each(function (index) {
        var $label = $(this);
        var amount = parseInt($('#' + $label.attr('for')).val(), 10);
        var amountText = '$' + (type === 'per year' ? amount * 12 : amount);
        var desc = $label.data(type === 'per year' ? 'yearly-desc' : 'monthly-desc');
        $(this).find(amountElement).text(amountText);
        $(this).find(descElement).text(desc);
      });
    }
  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
"use strict";

(function ($) {
  function benefitForm() {
    if (2 === performance.navigation.type) {
      location.reload(true);
    }

    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      var $button = $(this);
      var $status = $('.m-benefit-message', $(this).parent());
      var $select = $('select', $(this).parent());
      var settings = minnpost_membership_settings; // reset the message for current status

      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      } // set button to processing


      $button.text('Processing').addClass('a-button-disabled'); // disable all the other buttons

      $('.a-benefit-button').addClass('a-button-disabled'); // set ajax data

      var data = {};
      var benefitType = $('input[name="benefit-name"]').val();

      if ('partner-offers' === benefitType) {
        data = {
          'action': 'benefit_form_submit',
          'minnpost_membership_benefit_form_nonce': $button.data('benefit-nonce'),
          'current_url': $('input[name="current_url"]').val(),
          'benefit-name': $('input[name="benefit-name"]').val(),
          'instance_id': $('[name="instance-id-' + $button.val() + '"]').val(),
          'post_id': $button.val(),
          'is_ajax': '1'
        };
        $.post(settings.ajaxurl, data, function (response) {
          // success
          if (true === response.success) {
            //console.dir(response);
            $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);

            if (0 < $select.length) {
              $select.prop('disabled', true);
            }

            $('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
          } else {
            // error
            //console.dir(response);
            if ('undefined' === typeof response.data.remove_instance_value) {
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } else {
              $('option', $select).each(function (i) {
                if ($(this).val() === response.data.remove_instance_value) {
                  $(this).remove();
                }
              });

              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } // re-enable all the other buttons


            $('.a-benefit-button').not($button).removeClass('a-button-disabled');
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
          }
        });
      }
    });
  }

  $(document).ready(function () {
    if (0 < $('.m-form-membership-benefit').length) {
      benefitForm();
    }
  });
  $('.a-refresh-page').click(function (event) {
    event.preventDefault();
    location.reload();
  });
})(jQuery);
"use strict";

(function ($) {
  function mp_membership_analytics_tracking_event(type, category, action, label, value) {
    if (typeof ga !== 'undefined') {
      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
      } else {
        ga('send', type, category, action, label, value);
      }
    } else {
      return;
    }
  }

  $(document).ready(function () {
    $('.m-support-cta-top .a-support-button').click(function (event) {
      var value = '';

      if ($('svg', $(this)).length > 0) {
        value = $('svg', $(this)).attr('title') + ' ';
      }

      value = value + $(this).text();
      mp_membership_analytics_tracking_event('event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
    });
  });
})(jQuery);
"use strict";

// plugin
;

(function ($, window, document, undefined) {
  // Create the defaults once
  var pluginName = 'minnpostMembership',
      defaults = {
    'debug': false,
    // this can be set to true on page level options
    'amount_selector_standalone': '#amount-item #amount',
    'frequency_selector_standalone': '.m-membership-fast-select input[type="radio"]',
    'level_viewer_container': '.a-show-level',
    'level_name': '.a-level',
    'user_current_level': '.a-current-level',
    'user_new_level': '.a-new-level',
    'amount_viewer': '.amount h3',
    'frequency_selector_in_levels': '.a-form-item-membership-frequency',
    'frequency_selector_in_levels_type': 'select',
    'levels_container': '.o-membership-member-levels',
    'single_level_container': '.m-membership-member-level',
    'single_level_summary_selector': '.m-member-level-brief',
    'flipped_items': 'div.amount, div.enter',
    'level_frequency_text_selector': '.show-frequency',
    'choose_amount_selector_in_levels': '.amount .a-button-flip',
    'amount_selector_in_levels': '.enter input.amount-entry'
  }; // end defaults
  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init(reset, amount) {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
      this.catchHashLinks(this.element, this.options);
      this.levelFlipper(this.element, this.options);
      this.startLevelClick(this.element, this.options);
    },
    catchHashLinks: function catchHashLinks(element, options) {
      $('a[href*="#"]:not([href="#"])', element).click(function (e) {
        var target = $(e.target);

        if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');

          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top
            }, 1000);
            return false;
          }
        }
      });
    },
    // end catchLinks
    levelFlipper: function levelFlipper(element, options) {
      var that = this;
      var previous_amount = '';
      var amount = 0;
      var level = '';
      var level_number = 0;
      var frequency_string = '';
      var frequency = '';
      var frequency_name = '';

      if (typeof minnpost_membership_data !== 'undefined' && $(options.user_current_level).length > 0) {
        previous_amount = minnpost_membership_data.current_user.previous_amount;
      }

      if ($(options.amount_selector_standalone).length > 0 && $(options.frequency_selector_standalone).length > 0) {
        amount = $(options.amount_selector_standalone).val();
        frequency_string = $(options.frequency_selector_standalone + ':checked').val();
        frequency = frequency_string.split(' - ')[1];
        frequency_name = frequency_string.split(' - ')[0];
        level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
        that.showNewLevel(element, options, level);
        $(options.frequency_selector_standalone).change(function () {
          frequency_string = $(options.frequency_selector_standalone + ':checked').val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];
          level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
          that.showNewLevel(element, options, level);
        });
        $(options.amount_selector_standalone).bind('keyup mouseup', function () {
          frequency_string = $(options.frequency_selector_standalone + ':checked').val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if ($(this).data('last-value') != $(this).val()) {
            $(this).data('last-value', $(this).val());
            level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
            that.showNewLevel(element, options, level);
          }

          ;
        });
      }

      if ($(options.levels_container).length > 0) {
        $(options.single_level_summary_selector, element).each(function () {
          $(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
        });
        $(options.frequency_selector_in_levels, element).on('change', function (event) {
          level_number = $(this).data('member-level-number');
          frequency_string = $(this).val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if (typeof level_number !== 'undefined') {
            $(options.single_level_summary_selector, element).removeClass('flipped');
            $(options.single_level_container, element).removeClass('active');
            $(event.target).closest(options.single_level_summary_selector).addClass('flipped');

            if (frequency == 1) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
            } else if (frequency == 12) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
            }

            amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
            level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
            that.changeFrequency(frequency_string, level['name'], element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
              }
            });
          }

          that.changeAmountPreview(frequency_string, level['name'], element, options);
        });
      }

      if ($(options.choose_amount_selector_in_levels).length > 0) {
        $(options.choose_amount_selector_in_levels, element).click(function (event) {
          level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
          $(options.single_level_summary_selector, element).removeClass('flipped');
          $(options.single_level_container, element).removeClass('active');
          $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
          frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
          frequency = frequency_string.split(' - ')[1];
          amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
          level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper
    checkLevel: function checkLevel(amount, frequency, type, previous_amount, element, options) {
      var thisyear = parseInt(amount) * parseInt(frequency);
      var level = '';

      if (typeof previous_amount !== 'undefined' && previous_amount !== '') {
        var prior_year_amount = parseInt(previous_amount.prior_year_contributions);
        var coming_year_amount = parseInt(previous_amount.coming_year_contributions);
        var annual_recurring_amount = parseInt(previous_amount.annual_recurring_amount); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      level = this.getLevel(thisyear);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level['name']) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel
    getLevel: function getLevel(thisyear) {
      var level = [];

      if (thisyear > 0 && thisyear < 60) {
        level['name'] = 'Bronze';
        level['number'] = 1;
      } else if (thisyear > 59 && thisyear < 120) {
        level['name'] = 'Silver';
        level['number'] = 2;
      } else if (thisyear > 119 && thisyear < 240) {
        level['name'] = 'Gold';
        level['number'] = 3;
      } else if (thisyear > 239) {
        level['name'] = 'Platinum';
        level['number'] = 4;
      }

      return level;
    },
    // end getLevel
    showNewLevel: function showNewLevel(element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var level_viewer_container_selector = options.level_viewer_container; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function decodeHtmlEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      if ($(options.level_viewer_container).length > 0) {
        $(options.level_viewer_container).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

        if ($(options.user_current_level).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.level_viewer_container).length > 0) {
            level_viewer_container_selector = options.level_viewer_container + ' a';
          }

          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

          if (old_level !== level['name'].toLowerCase()) {
            $(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('changed')));
          } else {
            $(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('not-changed')));
          }
        }

        $(options.level_name, options.level_viewer_container).text(level['name']);
      }
    },
    // end showNewLevel
    changeFrequency: function changeFrequency(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];
        var frequency = parseInt(selected.split(' - ')[1]);
        $(options.frequency_selector_in_levels).val(selected);
        $(options.frequency_selector_in_levels).prop('selected', selected);

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
        $(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
      });
    },
    // end changeFrequency
    changeAmountPreview: function changeAmountPreview(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
      });
    },
    // end changeAmountPreview
    startLevelClick: function startLevelClick(element, options) {
      $('.start-level').click(function () {
        var level_class = $(this).prop('class');
        var level_number = level_class[level_class.length - 1];
        $(options.single_level_summary_selector, element).removeClass('flipped');
        $(options.single_level_container, element).removeClass('active');
        $(options.single_level_container + '-' + level_number, element).addClass('active');
        $(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
      });
    } // end startLevelClick

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
"use strict";

// plugin
;

(function ($, window, document) {
  // Create the defaults once
  var pluginName = 'minnpostTrackSubmit',
      defaults = {
    type: 'event',
    category: 'Support Us',
    action: 'Become A Member',
    label: location.pathname
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init() {
      var that = this;
      var options = this.options;
      $(this.element).submit(function (event) {
        that.analyticsEventTrack(options.type, options.category, options.action, options.label); // also bubbles the event up to submit the form
      });
    },
    analyticsEventTrack: function analyticsEventTrack(type, category, action, label, value) {
      if (typeof ga === 'undefined') {
        return;
      }

      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
        return;
      }

      ga('send', type, category, action, label, value);
    } // end analyticsEventTrack

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFtb3VudC1zZWxlY3QuanMiLCJiZW5lZml0cy5qcyIsImN0YS5qcyIsIm1lbWJlci1sZXZlbHMuanMiLCJ0cmFjay1zdWJtaXQuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRTZWxlY3RvciIsImFtb3VudExhYmVscyIsImFtb3VudFZhbHVlIiwiYW1vdW50RGVzY3JpcHRpb24iLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsInByb3RvdHlwZSIsImZyZXF1ZW5jaWVzIiwiZmluZCIsImFtb3VudCIsImNoYW5nZSIsIm9uRnJlcXVlbmN5Q2hhbmdlIiwiYmluZCIsImV2ZW50IiwiYW1vdW50RWxlbWVudCIsImRlc2NFbGVtZW50IiwibGFiZWxzIiwiZnJlcXVlbmN5U3RyaW5nIiwidGFyZ2V0IiwidmFsIiwidHlwZUFuZEZyZXF1ZW5jeSIsInR5cGUiLCJmcmVxdWVuY3kiLCJsZW5ndGgiLCJzcGxpdCIsInBhcnNlSW50IiwiZWFjaCIsImluZGV4IiwiJGxhYmVsIiwiYXR0ciIsImFtb3VudFRleHQiLCJkZXNjIiwiZGF0YSIsInRleHQiLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsInNldHRpbmdzIiwibWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncyIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwicHJvcCIsImJ1dHRvbl9hdHRyIiwiaHRtbCIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwibm90IiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwic2hvdyIsImhpZGUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCIsImNhdGVnb3J5IiwiYWN0aW9uIiwibGFiZWwiLCJ2YWx1ZSIsImdhIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwiY2hlY2tMZXZlbCIsInNob3dOZXdMZXZlbCIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsIm9uIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwidGhpc3llYXIiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJhbmFseXRpY3NFdmVudFRyYWNrIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7O0FBQUMsQ0FBQyxVQUFXQSxDQUFYLEVBQWNDLE1BQWQsRUFBc0JDLFFBQXRCLEVBQWlDO0FBQ2xDO0FBQ0EsTUFBSUMsVUFBVSxHQUFHLHNCQUFqQjtBQUFBLE1BQ0FDLFFBQVEsR0FBRztBQUNWQyxJQUFBQSxpQkFBaUIsRUFBRSx5Q0FEVDtBQUVWQyxJQUFBQSxjQUFjLEVBQUUsa0JBRk47QUFHVkMsSUFBQUEsWUFBWSxFQUFFLHdCQUhKO0FBSVZDLElBQUFBLFdBQVcsRUFBRSxRQUpIO0FBS1ZDLElBQUFBLGlCQUFpQixFQUFFO0FBTFQsR0FEWCxDQUZrQyxDQVdsQzs7QUFDQSxXQUFTQyxNQUFULENBQWlCQyxPQUFqQixFQUEwQkMsT0FBMUIsRUFBb0M7QUFDbkMsU0FBS0QsT0FBTCxHQUFlQSxPQUFmLENBRG1DLENBR25DO0FBQ0E7QUFDQTtBQUNBOztBQUNBLFNBQUtDLE9BQUwsR0FBZVosQ0FBQyxDQUFDYSxN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QyxDQUFDMkMsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeEMsVUFBMUIsRUFBc0MsSUFBSU8sTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxLQUpNLENBQVA7QUFLQSxHQU5EO0FBT0EsQ0FsRUEsRUFrRUdrQyxNQWxFSCxFQWtFVzdDLE1BbEVYLEVBa0VtQkMsUUFsRW5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0Jyxcblx0XHRhbW91bnRMYWJlbHM6ICcubS1hbW91bnQtc2VsZWN0IGxhYmVsJyxcblx0XHRhbW91bnRWYWx1ZTogJ3N0cm9uZycsXG5cdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBmcmVxdWVuY2llcyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciApO1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXG5cdFx0XHQkKCBmcmVxdWVuY2llcyApLmNoYW5nZSggdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0fSxcblxuXHRcdG9uRnJlcXVlbmN5Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgYW1vdW50RWxlbWVudCA9IHRoaXMub3B0aW9ucy5hbW91bnRWYWx1ZTtcblx0XHRcdHZhciBkZXNjRWxlbWVudCA9IHRoaXMub3B0aW9ucy5hbW91bnREZXNjcmlwdGlvbjtcblx0XHRcdHZhciBsYWJlbHMgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50TGFiZWxzICk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5U3RyaW5nID0gJCggZXZlbnQudGFyZ2V0ICkudmFsKCk7XG5cdFx0XHR2YXIgdHlwZUFuZEZyZXF1ZW5jeTtcblx0XHRcdHZhciB0eXBlO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeTtcblxuXHRcdFx0aWYgKCBsYWJlbHMubGVuZ3RoIDwgMCB8fCB0eXBlb2YgZnJlcXVlbmN5U3RyaW5nID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0eXBlQW5kRnJlcXVlbmN5ID0gZnJlcXVlbmN5U3RyaW5nLnNwbGl0KCcgLSAnKTtcblx0XHRcdHR5cGUgPSB0eXBlQW5kRnJlcXVlbmN5WzBdO1xuXHRcdFx0ZnJlcXVlbmN5ID0gcGFyc2VJbnQoIHR5cGVBbmRGcmVxdWVuY3lbMV0sIDEwICk7XG5cblx0XHRcdGxhYmVscy5lYWNoKCBmdW5jdGlvbiggaW5kZXggKSB7XG5cdFx0XHRcdHZhciAkbGFiZWwgPSAkKCB0aGlzICk7XG5cdFx0XHRcdHZhciBhbW91bnQgPSBwYXJzZUludCggJCggJyMnICsgJGxhYmVsLmF0dHIoICdmb3InICkgKS52YWwoKSwgMTAgKTtcblx0XHRcdFx0dmFyIGFtb3VudFRleHQgPSAnJCcgKyAoIHR5cGUgPT09ICdwZXIgeWVhcicgPyBhbW91bnQgKiAxMiA6IGFtb3VudCk7XG5cdFx0XHRcdHZhciBkZXNjID0gJGxhYmVsLmRhdGEoIHR5cGUgPT09ICdwZXIgeWVhcicgPyAneWVhcmx5LWRlc2MnIDogJ21vbnRobHktZGVzYycgKTtcblxuXHRcdFx0XHQkKCB0aGlzICkuZmluZCggYW1vdW50RWxlbWVudCApLnRleHQoIGFtb3VudFRleHQgKVxuXHRcdFx0XHQkKCB0aGlzICkuZmluZCggZGVzY0VsZW1lbnQgKS50ZXh0KCBkZXNjICk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdCAgIGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdCAgICBkYXRhID0ge1xuXHRcdFx0ICAgICAgICAnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdCAgICAgICAgJ21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHQgICAgICAgICdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaW5zdGFuY2VfaWQnIDogJCggJ1tuYW1lPVwiaW5zdGFuY2UtaWQtJyArICRidXR0b24udmFsKCkgKyAnXCJdJyApLnZhbCgpLFxuXHRcdFx0ICAgICAgICAncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaXNfYWpheCcgOiAnMScsXG5cdFx0XHQgICAgfTtcblxuXHRcdFx0ICAgICQucG9zdCggc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0ICAgIFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHQgICAgaWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgXHRpZiAoIDAgPCAkc2VsZWN0Lmxlbmd0aCApIHtcblx0XHRcdFx0ICAgIFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkudmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLmF0dHIoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdC8vIGVycm9yXG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0ICAgIFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0XHQkKCAnb3B0aW9uJywgJHNlbGVjdCApLmVhY2goIGZ1bmN0aW9uKCBpICkge1xuXHRcdFx0XHQgICAgXHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHQgICAgXHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdCAgICBcdFx0XHR9XG5cdFx0XHRcdCAgICBcdFx0fSk7XG5cdFx0XHRcdCAgICBcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgfVxuXG5cdFx0XHRcdH0pO1xuXHRcdCAgICB9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdH0pO1xuXG5cdCQoICcuYS1yZWZyZXNoLXBhZ2UnICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIiggZnVuY3Rpb24oICQgKSB7XG5cdGZ1bmN0aW9uIG1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50KCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHsgXG5cdFx0JCggJy5tLXN1cHBvcnQtY3RhLXRvcCAuYS1zdXBwb3J0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIHZhbHVlID0gJyc7XG5cdFx0XHRpZiAoICQoICdzdmcnLCAkKCB0aGlzICkgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHR2YWx1ZSA9ICQoICdzdmcnLCAkKCB0aGlzICkgKS5hdHRyKCAndGl0bGUnICkgKyAnICc7XG5cdFx0XHR9XG5cdFx0XHR2YWx1ZSA9IHZhbHVlICsgJCggdGhpcyApLnRleHQoKTtcblx0XHRcdG1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50KCAnZXZlbnQnLCAnU3VwcG9ydCBDVEEgLSBIZWFkZXInLCAnQ2xpY2s6ICcgKyB2YWx1ZSwgbG9jYXRpb24ucGF0aG5hbWUgKTtcblx0XHR9KTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcjYW1vdW50LWl0ZW0gI2Ftb3VudCcsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcubS1tZW1iZXJzaGlwLWZhc3Qtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0J2xldmVsX3ZpZXdlcl9jb250YWluZXInIDogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdCdsZXZlbF9uYW1lJyA6ICcuYS1sZXZlbCcsXG5cdFx0J3VzZXJfY3VycmVudF9sZXZlbCcgOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0J3VzZXJfbmV3X2xldmVsJyA6ICcuYS1uZXctbGV2ZWwnLFxuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHQgICAgdmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0ICAgIGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHQgICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgcHJldmlvdXNfYW1vdW50ID0gJyc7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICYmICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0cHJldmlvdXNfYW1vdW50ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblxuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lKS5iaW5kKCdrZXl1cCBtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICAgIGlmKCQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScpICE9ICQodGhpcykudmFsKCkpIHtcblx0XHRcdCAgICAgICAgJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJywgJCh0aGlzKS52YWwoKSk7XG5cdFx0XHQgICAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgICB9O1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0ICAgIGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHQgIHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHQgIHZhciBsZXZlbCA9ICcnO1xuXHRcdCAgaWYgKCB0eXBlb2YgcHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiBwcmV2aW91c19hbW91bnQgIT09ICcnICkge1xuXHRcdCAgICB2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgICAgLy8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0ICAgIGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHQgICAgICBwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfSBlbHNlIHtcblx0XHQgICAgICBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfVxuXG5cdFx0ICAgIHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICB9XG5cblx0XHQgIGxldmVsID0gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblxuXHRcdCAgJCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQgICAgaWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdCAgICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgICAgJCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgfVxuXHRcdCAgfSApO1xuXHRcdCAgcmV0dXJuIGxldmVsO1xuXG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBbXTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0bGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciArICcgYSc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfbmFtZSwgb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cdFx0XHR9XG5cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHQgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdCAgfSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdFRyYWNrU3VibWl0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayhcblx0XHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0XHRvcHRpb25zLmFjdGlvbixcblx0XHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHRcdCk7XG5cdFx0XHRcdC8vIGFsc28gYnViYmxlcyB0aGUgZXZlbnQgdXAgdG8gc3VibWl0IHRoZSBmb3JtXG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
