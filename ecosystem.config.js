// ecosystem.config.js
module.exports = {
  apps : [
    {
      name: "backend2",
      script: "npm",      
      args: "run server",        
      watch: true                 
   },
    {
      name: "worker",
      script: "npm",
      args: "run server:worker",
      watch: true
    }
  ]
};