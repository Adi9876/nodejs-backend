const Joi = require("joi");

const validateCreatePost = (data) => {
  const scheam = Joi.object({
    content: Joi.string().min(3).max(50).required(),
    mediaIds: Joi.array(), 
  });

  return scheam.validate(data);
};

module.exports = { validateCreatePost };
