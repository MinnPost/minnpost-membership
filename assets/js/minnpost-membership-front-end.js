"use strict";

;

(function (window) {
  function MinnPostMembership(data, settings) {
    this.data = {};

    if (typeof data !== 'undefined') {
      this.data = data;
    }

    this.settings = {};

    if (typeof settings !== 'undefined') {
      this.settings = settings;
    }

    this.previousAmount = '';

    if (typeof this.data.current_user !== 'undefined' && typeof this.data.current_user.previous_amount !== 'undefined') {
      this.previousAmount = this.data.current_user.previous_amount;
    }
  }

  MinnPostMembership.prototype = {
    checkLevel: function checkLevel(amount, frequency, type) {
      var thisyear = parseInt(amount) * parseInt(frequency);

      if (typeof this.previousAmount !== 'undefined' && this.previousAmount !== '') {
        var prior_year_amount = parseInt(this.previousAmount.prior_year_contributions, 10);
        var coming_year_amount = parseInt(this.previousAmount.coming_year_contributions, 10);
        var annual_recurring_amount = parseInt(this.previousAmount.annual_recurring_amount, 10); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      return this.getLevel(thisyear);
    },
    // end checkLevel
    getLevel: function getLevel(thisyear) {
      var level = {};

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
    } // end getLevel

  };
  window.MinnPostMembership = new MinnPostMembership(window.minnpost_membership_data, window.minnpost_membership_settings);
})(window);
"use strict";

// plugin
;

(function ($, window, document, MinnPostMembership) {
  // Create the defaults once
  var pluginName = 'minnpostAmountSelect',
      defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountGroup: '.m-frequency-group',
    amountSelector: '.m-amount-select input[type="radio"]',
    amountLabels: '.m-amount-select label',
    amountValue: 'strong',
    amountDescription: '.a-amount-description',
    amountField: '.a-amount-field #amount',
    levelViewer: '.a-show-level',
    levelName: '.a-level',
    userCurrentLevel: '.a-current-level',
    declineBenefits: '.m-decline-benefits-select input[type="radio"]',
    giftSelector: '.m-membership-gift-selector',
    subscriptionsSelector: '.m-select-subscription input[type="checkbox"]',
    declineSubscriptions: '#subscription-decline'
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
      var $frequency = $(this.element).find(this.options.frequencySelector);
      var $suggestedAmount = $(this.options.amountSelector);
      var $amount = $(this.element).find(this.options.amountField);
      var $declineBenefits = $(this.element).find(this.options.declineBenefits);
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      } // setup Analytics Enhanced Ecommerce plugin


      if (typeof ga !== 'undefined') {
        ga('require', 'ec');
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.checkAndSetLevel();
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $subscriptions.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($subscriptions.not(this.options.declineSubscriptions).is(':checked')) {
        $(this.element).find(this.options.declineSubscriptions).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $subscriptions.on('click', this.onSubscriptionsClick.bind(this));
    },
    // end init
    // step is the integer for the step in the ecommerce process.
    // for this purpose, it's probably always 1.
    // things we need to know: the level name, the amount, and the frequency
    // example:

    /*
    Running command: ga("ec:addProduct", {id: "minnpost_silver_membership", name: "MinnPost Silver Membership", category: "Donation", brand: "MinnPost", variant: "Monthly", price: "5", quantity: 1})
    */
    analyticsTracker: function analyticsTracker(level, amount, frequency_label) {
      if (typeof ga !== 'undefined') {
        ga('ec:addProduct', {
          'id': 'minnpost_' + level.toLowerCase() + '_membership',
          'name': 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
          'category': 'Donation',
          'brand': 'MinnPost',
          'variant': frequency_label,
          'price': amount,
          'quantity': 1
        });
      } else {
        return;
      }
    },
    // end analyticsTracker
    onFrequencyChange: function onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.checkAndSetLevel();
    },
    // end onFrequencyChange
    onSuggestedAmountChange: function onSuggestedAmountChange(event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel();
    },
    // end onSuggestedAmountChange
    onAmountChange: function onAmountChange(event) {
      this.clearAmountSelector(event);
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel();
      }
    },
    // end onAmountChange
    onDeclineBenefitsChange: function onDeclineBenefitsChange(event) {
      var $giftSelector = $(this.element).find(this.options.giftSelector);
      var decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();

      if (decline === 'true') {
        $giftSelector.hide();
        return;
      }

      $giftSelector.show();
    },
    // end onDeclineBenefitsChange
    onSubscriptionsClick: function onSubscriptionsClick(event) {
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector).not(this.options.declineSubscriptions);
      var $decline = $(this.element).find(this.options.declineSubscriptions);

      if ($(event.target).is(this.options.declineSubscriptions)) {
        $subscriptions.prop('checked', false);
        return;
      }

      $decline.prop('checked', false);
    },
    // end onSubscriptionsChange
    clearAmountSelector: function clearAmountSelector(event) {
      var $suggestedAmount = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      $suggestedAmount.removeAttr('checked');
    },
    // end clearAmountSelector
    setAmountLabels: function setAmountLabels(frequencyString) {
      var $groups = $(this.options.amountGroup);
      var $selected = $(this.options.amountSelector).filter(':checked');
      var index = $selected.data('index');
      $groups.removeClass('active');
      $groups.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      $selected.prop('checked', false);
      $groups.filter('.active').find('input[type="radio"][data-index="' + index + '"]').prop('checked', true);
    },
    // end setAmountLabels
    checkAndSetLevel: function checkAndSetLevel() {
      var amount = $(this.options.amountSelector).filter(':checked').val();

      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }

      var frequency_string = $(this.options.frequencySelector + ':checked').val();
      var frequency = frequency_string.split(' - ')[1];
      var frequency_name = frequency_string.split(' - ')[0];
      var frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      var frequency_label = $('label[for="' + frequency_id + '"]').text();
      var level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      this.showNewLevel(this.element, this.options, level);
      this.analyticsTracker(level['name'], amount, frequency_label);
    },
    // end checkAndSetLevel
    showNewLevel: function showNewLevel(element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function decodeHtmlEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      if ($(options.levelViewer).length > 0) {
        $(options.levelViewer).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

        if ($(options.userCurrentLevel).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.levelViewer).length > 0) {
            levelViewerContainer = options.levelViewer + ' a';
          }

          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

          if (old_level !== level['name'].toLowerCase()) {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('changed')));
          } else {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('not-changed')));
          }
        }

        $(options.levelName, options.levelViewer).text(level['name']);
      }
    } // end showNewLevel

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
})(jQuery, window, document, MinnPostMembership);
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

(function ($, window, document, MinnPostMembership, undefined) {
  // Create the defaults once
  var pluginName = 'minnpostMembership',
      defaults = {
    'debug': false,
    // this can be set to true on page level options
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
      var amount = 0;
      var level = '';
      var level_number = 0;
      var frequency_string = '';
      var frequency = '';
      var frequency_name = '';

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
            level = that.checkLevel(amount, frequency, frequency_name, element, options);
            that.changeFrequency(frequency_string, level['name'], element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, element, options);
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
          level = that.checkLevel(amount, frequency, frequency_name, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper
    checkLevel: function checkLevel(amount, frequency, type, element, options) {
      var level = MinnPostMembership.checkLevel(amount, frequency, type);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level['name']) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel
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
})(jQuery, window, document, MinnPostMembership);
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
        // this tracks an event submission based on the plugin options
        // it also bubbles the event up to submit the form
        that.analyticsEventTrack(options.type, options.category, options.action, options.label); // if this is the main checkout form, send it to the ec plugin as a checkout

        that.analyticsEcommerceTrack($(that.element));
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
    },
    // end analyticsEventTrack
    analyticsEcommerceTrack: function analyticsEcommerceTrack(element) {
      if (typeof ga === 'undefined') {
        return;
      }

      ga('require', 'ec');

      if (element.hasClass('m-form-membership-support')) {
        ga('ec:setAction', 'checkout', {
          'step': 1
        });
      }
    } // end analyticsEcommerceTrack

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIiwidHJhY2stc3VibWl0LmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0b3IiLCJzdWJzY3JpcHRpb25zU2VsZWN0b3IiLCJkZWNsaW5lU3Vic2NyaXB0aW9ucyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwiJGZyZXF1ZW5jeSIsImZpbmQiLCIkc3VnZ2VzdGVkQW1vdW50IiwiJGFtb3VudCIsIiRkZWNsaW5lQmVuZWZpdHMiLCIkc3Vic2NyaXB0aW9ucyIsImxlbmd0aCIsImdhIiwic2V0QW1vdW50TGFiZWxzIiwiZmlsdGVyIiwidmFsIiwiY2hlY2tBbmRTZXRMZXZlbCIsIm9uIiwib25GcmVxdWVuY3lDaGFuZ2UiLCJiaW5kIiwib25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UiLCJvbkFtb3VudENoYW5nZSIsIm5vdCIsImlzIiwicHJvcCIsIm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlIiwib25TdWJzY3JpcHRpb25zQ2xpY2siLCJhbmFseXRpY3NUcmFja2VyIiwiZnJlcXVlbmN5X2xhYmVsIiwidG9Mb3dlckNhc2UiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwiZXZlbnQiLCJ0YXJnZXQiLCJjbGVhckFtb3VudFNlbGVjdG9yIiwiJHRhcmdldCIsIiRnaWZ0U2VsZWN0b3IiLCJkZWNsaW5lIiwiaGlkZSIsInNob3ciLCIkZGVjbGluZSIsInJlbW92ZUF0dHIiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZnJlcXVlbmN5X3N0cmluZyIsInNwbGl0IiwiZnJlcXVlbmN5X25hbWUiLCJmcmVxdWVuY3lfaWQiLCJ0ZXh0Iiwic2hvd05ld0xldmVsIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsVmlld2VyQ29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsInJlcGxhY2UiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJmbiIsImVhY2giLCJqUXVlcnkiLCJiZW5lZml0Rm9ybSIsInBlcmZvcm1hbmNlIiwibmF2aWdhdGlvbiIsImxvY2F0aW9uIiwicmVsb2FkIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsImJlbmVmaXRUeXBlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJidXR0b25fYXR0ciIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwiYXR0ciIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsImkiLCJyZW1vdmUiLCJyZWFkeSIsIm1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50IiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJhbmFseXRpY3NFY29tbWVyY2VUcmFjayIsImhhc0NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUFDLENBQUMs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O0FBQ0E7QUFDRCxLQUpNLENBQVA7QUFLQSxHQU5EO0FBT0EsQ0FsRkEsRUFrRkdxRSxNQWxGSCxFQWtGV2xILE1BbEZYLEVBa0ZtQjBCLFFBbEZuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIjsoZnVuY3Rpb24gKCB3aW5kb3cgKSB7XG5cdGZ1bmN0aW9uIE1pbm5Qb3N0TWVtYmVyc2hpcCggZGF0YSwgc2V0dGluZ3MgKSB7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0aWYgKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5kYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHR0aGlzLnNldHRpbmdzID0ge307XG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHR9XG5cblx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gJyc7XG5cdFx0aWYgKCB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlciAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHQgICAgIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0fVxuXHR9XG5cblx0TWlublBvc3RNZW1iZXJzaGlwLnByb3RvdHlwZSA9IHtcblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKSB7XG5cdFx0XHR2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0XHRpZiAoIHR5cGVvZiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAnJyApIHtcblx0XHRcdFx0dmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQsIDEwICk7XG5cdFx0XHRcdC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdFx0XHRpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IHt9O1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXHR9O1xuXG5cdHdpbmRvdy5NaW5uUG9zdE1lbWJlcnNoaXAgPSBuZXcgTWlublBvc3RNZW1iZXJzaGlwKFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEsXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3Ncblx0KTtcbn0pKCB3aW5kb3cgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50R3JvdXA6ICcubS1mcmVxdWVuY3ktZ3JvdXAnLFxuXHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdGFtb3VudFZhbHVlOiAnc3Ryb25nJyxcblx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCcsXG5cdFx0bGV2ZWxWaWV3ZXI6ICcuYS1zaG93LWxldmVsJyxcblx0XHRsZXZlbE5hbWU6ICcuYS1sZXZlbCcsXG5cdFx0dXNlckN1cnJlbnRMZXZlbDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdGRlY2xpbmVCZW5lZml0czogJy5tLWRlY2xpbmUtYmVuZWZpdHMtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0Z2lmdFNlbGVjdG9yOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yJyxcblx0XHRzdWJzY3JpcHRpb25zU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3Vic2NyaXB0aW9uIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScsXG5cdFx0ZGVjbGluZVN1YnNjcmlwdGlvbnM6ICcjc3Vic2NyaXB0aW9uLWRlY2xpbmUnXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkZnJlcXVlbmN5ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICk7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXHRcdFx0dmFyICRhbW91bnQgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKTtcblx0XHRcdHZhciAkZGVjbGluZUJlbmVmaXRzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApO1xuXHRcdFx0dmFyICRzdWJzY3JpcHRpb25zID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApO1xuXHRcdFx0aWYgKCAhKCAkYW1vdW50Lmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgICAgJGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRzdWdnZXN0ZWRBbW91bnQubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNldHVwIEFuYWx5dGljcyBFbmhhbmNlZCBFY29tbWVyY2UgcGx1Z2luXG5cdFx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAncmVxdWlyZScsICdlYycgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXG5cdFx0XHQkZnJlcXVlbmN5Lm9uKCAnY2hhbmdlJywgdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKCAnY2hhbmdlJywgdGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkYW1vdW50Lm9uKCAna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXG5cdFx0XHRpZiAoICEgKCAkZGVjbGluZUJlbmVmaXRzLmxlbmd0aCA+IDAgJiYgJHN1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0aWYgKCAkc3Vic2NyaXB0aW9ucy5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdH1cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblxuXHRcdFx0JGRlY2xpbmVCZW5lZml0cy5vbiggJ2NoYW5nZScsIHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UuYmluZCggdGhpcyApICk7XG5cdFx0XHQkc3Vic2NyaXB0aW9ucy5vbiggJ2NsaWNrJywgdGhpcy5vblN1YnNjcmlwdGlvbnNDbGljay5iaW5kKCB0aGlzICkgKTtcblx0XHR9LCAvLyBlbmQgaW5pdFxuXG5cdFx0IC8vIHN0ZXAgaXMgdGhlIGludGVnZXIgZm9yIHRoZSBzdGVwIGluIHRoZSBlY29tbWVyY2UgcHJvY2Vzcy5cblx0XHQgLy8gZm9yIHRoaXMgcHVycG9zZSwgaXQncyBwcm9iYWJseSBhbHdheXMgMS5cblx0XHQgLy8gdGhpbmdzIHdlIG5lZWQgdG8ga25vdzogdGhlIGxldmVsIG5hbWUsIHRoZSBhbW91bnQsIGFuZCB0aGUgZnJlcXVlbmN5XG5cdFx0IC8vIGV4YW1wbGU6XG5cdFx0IC8qXG5cdFx0IFJ1bm5pbmcgY29tbWFuZDogZ2EoXCJlYzphZGRQcm9kdWN0XCIsIHtpZDogXCJtaW5ucG9zdF9zaWx2ZXJfbWVtYmVyc2hpcFwiLCBuYW1lOiBcIk1pbm5Qb3N0IFNpbHZlciBNZW1iZXJzaGlwXCIsIGNhdGVnb3J5OiBcIkRvbmF0aW9uXCIsIGJyYW5kOiBcIk1pbm5Qb3N0XCIsIHZhcmlhbnQ6IFwiTW9udGhseVwiLCBwcmljZTogXCI1XCIsIHF1YW50aXR5OiAxfSlcblx0XHQgKi9cblx0XHRhbmFseXRpY3NUcmFja2VyOiBmdW5jdGlvbiggbGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ2VjOmFkZFByb2R1Y3QnLCB7XG5cdFx0XHRcdFx0J2lkJzogJ21pbm5wb3N0XycgKyBsZXZlbC50b0xvd2VyQ2FzZSgpICsgJ19tZW1iZXJzaGlwJyxcblx0XHRcdFx0XHQnbmFtZSc6ICdNaW5uUG9zdCAnICsgbGV2ZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBsZXZlbC5zbGljZSgxKSArICcgTWVtYmVyc2hpcCcsXG5cdFx0XHRcdFx0J2NhdGVnb3J5JzogJ0RvbmF0aW9uJyxcblx0XHRcdFx0XHQnYnJhbmQnOiAnTWlublBvc3QnLFxuXHRcdFx0XHRcdCd2YXJpYW50JzogIGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0XHQncHJpY2UnOiBhbW91bnQsXG5cdFx0XHRcdFx0J3F1YW50aXR5JzogMVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzVHJhY2tlclxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0fSwgLy8gZW5kIG9uRnJlcXVlbmN5Q2hhbmdlXG5cblx0XHRvblN1Z2dlc3RlZEFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHR9LCAvLyBlbmQgb25TdWdnZXN0ZWRBbW91bnRDaGFuZ2VcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IoIGV2ZW50ICk7XG5cblx0XHRcdHZhciAkdGFyZ2V0ID0gJCggZXZlbnQudGFyZ2V0ICk7XG5cdFx0XHRpZiAoICR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnICkgIT0gJHRhcmdldC52YWwoKSApIHtcblx0XHRcdFx0JHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScsICR0YXJnZXQudmFsKCkgKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uQW1vdW50Q2hhbmdlXG5cblx0XHRvbkRlY2xpbmVCZW5lZml0c0NoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRnaWZ0U2VsZWN0b3IgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yICk7XG5cdFx0XHR2YXIgZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblxuXHRcdFx0aWYgKCBkZWNsaW5lID09PSAndHJ1ZScgKSB7XG5cdFx0XHRcdCRnaWZ0U2VsZWN0b3IuaGlkZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRnaWZ0U2VsZWN0b3Iuc2hvdygpO1xuXHRcdH0sIC8vIGVuZCBvbkRlY2xpbmVCZW5lZml0c0NoYW5nZVxuXG5cdFx0b25TdWJzY3JpcHRpb25zQ2xpY2s6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKS5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXHRcdFx0dmFyICRkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkuaXMoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApICkge1xuXHRcdFx0XHQkc3Vic2NyaXB0aW9ucy5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGRlY2xpbmUucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBvblN1YnNjcmlwdGlvbnNDaGFuZ2VcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3I6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3VnZ2VzdGVkQW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgPT09ICcnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucmVtb3ZlQXR0cignY2hlY2tlZCcpO1xuXHRcdH0sIC8vIGVuZCBjbGVhckFtb3VudFNlbGVjdG9yXG5cblx0XHRzZXRBbW91bnRMYWJlbHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGdyb3VwcyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRHcm91cCApO1xuXHRcdFx0dmFyICRzZWxlY3RlZCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApXG5cdFx0XHQgICAgLmZpbHRlciggJzpjaGVja2VkJyApO1xuXHRcdFx0dmFyIGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoICdpbmRleCcgKTtcblxuXHRcdFx0JGdyb3Vwcy5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JHNlbGVjdGVkLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKVxuXHRcdFx0XHQuZmluZCggJ2lucHV0W3R5cGU9XCJyYWRpb1wiXVtkYXRhLWluZGV4PVwiJyArIGluZGV4ICsgJ1wiXScgKVxuXHRcdFx0XHQucHJvcCggJ2NoZWNrZWQnLCB0cnVlICk7XG5cdFx0fSwgLy8gZW5kIHNldEFtb3VudExhYmVsc1xuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHRpZiAoIHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfaWQgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkucHJvcCggJ2lkJyApO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9sYWJlbCA9ICQoICdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXScgKS50ZXh0KCk7XG5cblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdHRoaXMuYW5hbHl0aWNzVHJhY2tlciggbGV2ZWxbJ25hbWUnXSwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tBbmRTZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJDdXJyZW50TGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbE5hbWUsIG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblx0XHRcdH1cblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdCdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0XHRcdCdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdFx0XHQncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdCdpc19hamF4JyA6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXHRmdW5jdGlvbiBtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7IFxuXHRcdCQoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdFx0aWYgKCAkKCAnc3ZnJywgJCggdGhpcyApICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0dmFsdWUgPSAkKCAnc3ZnJywgJCggdGhpcyApICkuYXR0ciggJ3RpdGxlJyApICsgJyAnO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSB2YWx1ZSArICQoIHRoaXMgKS50ZXh0KCk7XG5cdFx0XHRtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwLCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0XHRpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKTtcblxuXHRcdFx0JCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdFRyYWNrU3VibWl0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdC8vIHRoaXMgdHJhY2tzIGFuIGV2ZW50IHN1Ym1pc3Npb24gYmFzZWQgb24gdGhlIHBsdWdpbiBvcHRpb25zXG5cdFx0XHRcdC8vIGl0IGFsc28gYnViYmxlcyB0aGUgZXZlbnQgdXAgdG8gc3VibWl0IHRoZSBmb3JtXG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayhcblx0XHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0XHRvcHRpb25zLmFjdGlvbixcblx0XHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHRcdCk7XG5cdFx0XHRcdC8vIGlmIHRoaXMgaXMgdGhlIG1haW4gY2hlY2tvdXQgZm9ybSwgc2VuZCBpdCB0byB0aGUgZWMgcGx1Z2luIGFzIGEgY2hlY2tvdXRcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFY29tbWVyY2VUcmFjayggJCggdGhhdC5lbGVtZW50ICkgKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRXZlbnRUcmFja1xuXG5cdFx0YW5hbHl0aWNzRWNvbW1lcmNlVHJhY2s6IGZ1bmN0aW9uKCBlbGVtZW50ICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRnYSggJ3JlcXVpcmUnLCAnZWMnICk7XG5cdFx0XHRpZiAoIGVsZW1lbnQuaGFzQ2xhc3MoICdtLWZvcm0tbWVtYmVyc2hpcC1zdXBwb3J0JyApICkge1xuXHRcdFx0XHRnYSggJ2VjOnNldEFjdGlvbicsICdjaGVja291dCcsIHtcblx0XHRcdFx0XHQnc3RlcCc6IDEsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFY29tbWVyY2VUcmFja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
